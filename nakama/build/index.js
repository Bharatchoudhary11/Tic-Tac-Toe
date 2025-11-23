"use strict";
/// <reference path="./nakama-runtime.d.ts" />
const MATCH_NAME = 'tictactoe';
const TICK_RATE = 5;
const MAX_PLAYERS = 2;
const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];
const createInitialState = () => ({
    board: Array(9).fill(null),
    players: {},
    currentTurn: 'X',
    winner: null,
    isDraw: false,
    matchOver: false,
    createdAt: new Date().toISOString(),
    label: { open_slots: MAX_PLAYERS },
});
const encodeLabel = (state) => JSON.stringify({
    open_slots: Math.max(0, MAX_PLAYERS - Object.keys(state.players).length),
    created_at: state.createdAt,
    mode: MATCH_NAME,
});
const assignMark = (state) => {
    const marks = Object.values(state.players).map((p) => p.mark);
    if (!marks.includes('X'))
        return 'X';
    return 'O';
};
const findPlayerEntry = (state, userId) => {
    const entry = Object.entries(state.players).find(([, info]) => info.presence.user_id === userId);
    if (!entry) {
        return null;
    }
    const [sessionId, info] = entry;
    return { sessionId, info };
};
const serializeState = (state) => ({
    board: state.board,
    currentTurn: state.matchOver ? null : state.currentTurn,
    winner: state.winner,
    isDraw: state.isDraw,
    matchOver: state.matchOver,
    assignments: Object.values(state.players).map((player) => ({
        userId: player.presence.user_id,
        username: player.presence.username,
        mark: player.mark,
    })),
    createdAt: state.createdAt,
});
const broadcastState = (dispatcher, state, presences) => {
    dispatcher.broadcastMessage(1 /* OpCode.STATE */, JSON.stringify(serializeState(state)), presences);
};
const calculateWinner = (board) => {
    for (const [a, b, c] of winningLines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
};
const handleMove = (state, dispatcher, logger, message) => {
    if (!message.data) {
        return;
    }
    const player = state.players[message.presence.session_id];
    if (!player) {
        return;
    }
    if (state.matchOver) {
        dispatcher.broadcastMessage(3 /* OpCode.ERROR */, JSON.stringify({ message: 'Game is finished.' }), [message.presence]);
        return;
    }
    if (player.mark !== state.currentTurn) {
        dispatcher.broadcastMessage(3 /* OpCode.ERROR */, JSON.stringify({ message: "It's not your turn." }), [message.presence]);
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(nk.binaryToString(message.data));
    }
    catch (err) {
        logger.error('Failed to parse move payload: %q', err);
        dispatcher.broadcastMessage(3 /* OpCode.ERROR */, JSON.stringify({ message: 'Invalid payload.' }), [message.presence]);
        return;
    }
    const index = parsed.index;
    if (typeof index !== 'number' || index < 0 || index > 8) {
        dispatcher.broadcastMessage(3 /* OpCode.ERROR */, JSON.stringify({ message: 'Index out of range.' }), [message.presence]);
        return;
    }
    if (state.board[index]) {
        dispatcher.broadcastMessage(3 /* OpCode.ERROR */, JSON.stringify({ message: 'Cell already taken.' }), [message.presence]);
        return;
    }
    state.board[index] = player.mark;
    const winner = calculateWinner(state.board);
    if (winner) {
        state.winner = winner;
        state.matchOver = true;
    }
    else if (state.board.every((cell) => cell !== null)) {
        state.isDraw = true;
        state.matchOver = true;
    }
    else {
        state.currentTurn = state.currentTurn === 'X' ? 'O' : 'X';
    }
    broadcastState(dispatcher, state);
};
const matchInit = (_ctx, _logger, _nk, _dispatcher, _tick, _state, _data) => {
    const state = createInitialState();
    return {
        state,
        tickRate: TICK_RATE,
        label: encodeLabel(state),
    };
};
const matchJoinAttempt = (_ctx, logger, _nk, _dispatcher, _tick, state, presence, _metadata) => {
    const existing = findPlayerEntry(state, presence.user_id);
    if (existing) {
        logger.debug('Allowing rejoin for user %q', presence.user_id);
        return { state, accept: true };
    }
    if (Object.keys(state.players).length >= MAX_PLAYERS) {
        logger.debug('Rejecting join attempt, match full.');
        return {
            state,
            accept: false,
            rejectMessage: 'Match already full.',
        };
    }
    return { state, accept: true };
};
const matchJoin = (_ctx, logger, _nk, dispatcher, _tick, state, presences) => {
    for (const presence of presences) {
        const existing = findPlayerEntry(state, presence.user_id);
        if (existing) {
            state.players[presence.session_id] = {
                mark: existing.info.mark,
                presence,
            };
            delete state.players[existing.sessionId];
            logger.info('Player %q rejoined match as %s', presence.user_id, existing.info.mark);
            continue;
        }
        const mark = assignMark(state);
        state.players[presence.session_id] = { mark, presence };
        logger.debug('Player %q joined as %q', presence.user_id, mark);
    }
    state.label = { open_slots: MAX_PLAYERS - Object.keys(state.players).length };
    broadcastState(dispatcher, state);
    return { state, label: encodeLabel(state) };
};
const matchLeave = (_ctx, logger, _nk, dispatcher, _tick, state, presences) => {
    for (const presence of presences) {
        delete state.players[presence.session_id];
        logger.info('Player %q left match.', presence.user_id);
    }
    const remaining = Object.values(state.players);
    if (!state.matchOver && remaining.length === 1) {
        state.matchOver = true;
        state.winner = remaining[0].mark;
        logger.info('Player %q wins due to forfeit.', remaining[0].presence.user_id);
    }
    state.label = { open_slots: MAX_PLAYERS - Object.keys(state.players).length };
    broadcastState(dispatcher, state);
    if (Object.keys(state.players).length === 0) {
        return { state, terminate: true };
    }
    return { state, label: encodeLabel(state) };
};
const matchLoop = (_ctx, logger, _nk, dispatcher, _tick, state, messages) => {
    for (const message of messages) {
        if (message.op_code === 2 /* OpCode.MOVE */) {
            handleMove(state, dispatcher, logger, message);
        }
    }
    return { state };
};
const matchTerminate = (_ctx, _logger, _nk, _dispatcher, _tick, state, _reason) => ({
    state,
});
const matchHandler = {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
};
const matchmakerMatched = (_ctx, logger, nk, matches) => {
    if (matches.length === 0) {
        return null;
    }
    const ticket = matches[0].ticket;
    const mode = ticket && ticket.string_properties ? ticket.string_properties.mode : undefined;
    if (mode !== MATCH_NAME) {
        logger.debug('Skipping ticket for mode %q', mode);
        return null;
    }
    logger.info('Matchmaker paired %d players for %s', matches.length, MATCH_NAME);
    return nk.matchCreate(MATCH_NAME);
};
function InitModule(ctx, logger, nk, initializer) {
    initializer.registerMatch(MATCH_NAME, matchHandler);
    initializer.registerMatchmakerMatched(`${MATCH_NAME}_matchmaker`, matchmakerMatched);
    logger.info('Authoritative Tic-Tac-Toe module loaded.');
}
// Ensure Nakama can discover the entrypoint when loading the compiled module.
// Assigning to the global object makes the function visible to the runtime
// even if the build step or module system strips CommonJS exports.
globalThis.InitModule = InitModule;
// Preserve CommonJS exports for compatibility with tooling and tests.
module.exports = { InitModule };
