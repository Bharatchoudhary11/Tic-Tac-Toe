import { Client, type Session, type Socket } from '@heroiclabs/nakama-js';
import { useMemo, useRef, useState } from 'react';
import { Board } from './components/Board';
import type { MatchStatePayload, Mark } from './types';
import { OpCode } from './types';
import { getOrCreateDeviceId } from './services/device';

const MATCH_QUERY = '*';
const MATCH_MODE = 'tictactoe';
const MAX_PLAYERS = 2;
const decoder = new TextDecoder();

const host = import.meta.env.VITE_NAKAMA_HOST ?? '127.0.0.1';
const port = import.meta.env.VITE_NAKAMA_PORT ?? '7350';
const useSSL = (import.meta.env.VITE_NAKAMA_SSL ?? 'false') === 'true';
const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY ?? 'defaultkey';

type Stage = 'idle' | 'connecting' | 'matchmaking' | 'playing' | 'complete' | 'error';

const App = () => {
  const [username, setUsername] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [state, setState] = useState<MatchStatePayload | null>(null);
  const [localMark, setLocalMark] = useState<Mark | null>(null);

  const client = useMemo(() => new Client(serverKey, host, port, useSSL), []);
  const sessionRef = useRef<Session | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const ticketRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const resetGameState = () => {
    setState(null);
    setLocalMark(null);
  };

  const registerSocketHandlers = (socket: Socket) => {
    socket.onmatchmakermatched = async (matchmakerMatched) => {
      try {
        const match = await socket.joinMatch(undefined, matchmakerMatched.token);
        matchIdRef.current = match.match_id;
        setStage('playing');
        setInfo('Opponent found. Good luck!');
      } catch (err) {
        console.error(err);
        setStage('error');
        setError('Unable to join match. Please retry.');
      }
    };

    socket.onmatchdata = (matchData) => {
      if (!matchData.data) return;
      const payload = JSON.parse(decoder.decode(matchData.data));
      if (matchData.op_code === OpCode.STATE) {
        setState(payload as MatchStatePayload);
        if (userIdRef.current) {
          const assignment = (payload as MatchStatePayload).assignments.find(
            (entry) => entry.userId === userIdRef.current,
          );
          setLocalMark(assignment?.mark ?? null);
        }
        if ((payload as MatchStatePayload).matchOver) {
          setStage('complete');
          setInfo((payload as MatchStatePayload).winner ? 'Match decided.' : 'Match ended in a draw.');
        } else {
          setInfo(null);
        }
      } else if (matchData.op_code === OpCode.ERROR) {
        setInfo((payload as { message?: string }).message ?? 'Server rejected the move.');
      }
    };

    socket.ondisconnect = (evt) => {
      console.error('Socket disconnected', evt);
      setStage('error');
      setError('Lost connection to Nakama. Refresh or reconnect.');
    };
  };

  const queueForMatch = async () => {
    if (!socketRef.current) return;
    setStage('matchmaking');
    setInfo('Looking for other players...');
    const ticket = await socketRef.current.addMatchmaker(
      MATCH_QUERY,
      MAX_PLAYERS,
      MAX_PLAYERS,
      { mode: MATCH_MODE },
    );
    ticketRef.current = ticket.ticket;
  };

  const connectAndQueue = async () => {
    if (!username.trim()) {
      setError('Display name is required');
      return;
    }
    setError(null);
    resetGameState();
    await leaveCurrentMatch();
    if (socketRef.current) {
      socketRef.current.disconnect(false);
      socketRef.current = null;
    }

    try {
      setStage('connecting');
      setInfo('Connecting to Nakama…');

      const session = await client.authenticateCustom(
        getOrCreateDeviceId(),
        true,
        username.trim(),
      );
      sessionRef.current = session;
      userIdRef.current = session.user_id ?? null;

      const socket = client.createSocket(useSSL, false);
      await socket.connect(session, true);
      socketRef.current = socket;
      registerSocketHandlers(socket);
      await queueForMatch();
    } catch (err) {
      console.error(err);
      setStage('error');
      setError('Failed to connect to Nakama. Ensure the server is running.');
    }
  };

  const leaveCurrentMatch = async () => {
    const socket = socketRef.current;
    if (ticketRef.current && socket) {
      try {
        await socket.removeMatchmaker(ticketRef.current);
      } catch (err) {
        console.warn('Unable to remove matchmaker ticket', err);
      }
      ticketRef.current = null;
    }

    if (socket && matchIdRef.current) {
      try {
        await socket.leaveMatch(matchIdRef.current);
      } catch (err) {
        console.warn('Unable to leave match', err);
      }
      matchIdRef.current = null;
    }
    setStage('idle');
    setInfo('Left the queue.');
  };

  const findNextMatch = async () => {
    await leaveCurrentMatch();
    resetGameState();
    if (socketRef.current) {
      await queueForMatch();
    } else {
      setStage('idle');
    }
  };

  const isMyTurn = Boolean(state && localMark && state.currentTurn === localMark);
  const canPlay = Boolean(state && stage === 'playing' && isMyTurn && !state.matchOver);

  const handleMove = (index: number) => {
    if (!canPlay || !socketRef.current || !matchIdRef.current) return;
    socketRef.current.sendMatchState(matchIdRef.current, OpCode.MOVE, JSON.stringify({ index }));
  };

  const opponentName = (() => {
    if (!state || !userIdRef.current) return null;
    const opponent = state.assignments.find((player) => player.userId !== userIdRef.current);
    return opponent?.username ?? null;
  })();

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Tic-Tac-Toe Online</h1>
        <p className="subtitle">Server-authoritative multiplayer powered by Nakama</p>

        <div className="form-row">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Display name"
            disabled={stage !== 'idle' && stage !== 'error'}
          />
          <button
            type="button"
            onClick={connectAndQueue}
            disabled={stage !== 'idle' && stage !== 'error'}
          >
            {stage === 'idle' ? 'Play Online' : 'Reconnect'}
          </button>
        </div>

        <div className="status">
          <strong>Status:</strong> {stage === 'idle' && 'Idle'}
          {stage === 'connecting' && 'Connecting to server…'}
          {stage === 'matchmaking' && 'Matchmaking…'}
          {stage === 'playing' && 'In progress'}
          {stage === 'complete' && 'Match finished'}
          {stage === 'error' && 'Error'}
        </div>

        {info && <div className="info">{info}</div>}
        {error && <div className="error">{error}</div>}

        {state && (
          <div className="match-meta">
            <p>
              You are <span className="badge">{localMark ?? '?'}</span>
            </p>
            <p>Opponent: {opponentName ?? 'Waiting…'}</p>
            <p>
              Turn:{' '}
              {state.matchOver
                ? state.winner
                  ? `${state.winner} wins`
                  : 'Draw'
                : state.currentTurn}
            </p>
          </div>
        )}

        <Board
          cells={state?.board ?? Array(9).fill(null)}
          disabled={!canPlay}
          onMove={handleMove}
        />

        <div className="actions">
          <button type="button" onClick={findNextMatch} disabled={!socketRef.current}>
            Find Another Match
          </button>
          <button type="button" onClick={leaveCurrentMatch} disabled={!socketRef.current}>
            Leave Queue
          </button>
        </div>
      </section>
    </main>
  );
};

export default App;
