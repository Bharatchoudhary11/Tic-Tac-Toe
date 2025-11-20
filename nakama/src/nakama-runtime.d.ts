declare module '@heroiclabs/nakama-runtime' {
  interface Context {
    env: Record<string, string>;
  }

  interface Logger {
    info(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
  }

  interface MatchPresence {
    user_id: string;
    session_id: string;
    username: string;
    node?: string;
  }

  interface MatchData {
    op_code: number;
    data?: Uint8Array;
    presence: MatchPresence;
  }

  interface MatchLabel {
    [key: string]: string | number | undefined;
  }

  interface Dispatcher {
    broadcastMessage(opCode: number, data: string | Uint8Array, presences?: MatchPresence[]): void;
  }

  interface MatchStateResponse<S> {
    state: S;
    tickRate?: number;
    label?: string;
    accept?: boolean;
    rejectMessage?: string;
    terminate?: boolean;
  }

  type MatchInitFunction<S> = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: Dispatcher,
    tick: number,
    state: S,
    data: string,
  ) => MatchStateResponse<S>;

  type MatchJoinAttemptFunction<S> = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: Dispatcher,
    tick: number,
    state: S,
    presence: MatchPresence,
    metadata: Record<string, unknown>,
  ) => MatchStateResponse<S> & { accept: boolean; rejectMessage?: string };

  type MatchJoinFunction<S> = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: Dispatcher,
    tick: number,
    state: S,
    presences: MatchPresence[],
  ) => MatchStateResponse<S>;

  type MatchLeaveFunction<S> = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: Dispatcher,
    tick: number,
    state: S,
    presences: MatchPresence[],
  ) => MatchStateResponse<S>;

  type MatchLoopFunction<S> = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: Dispatcher,
    tick: number,
    state: S,
    messages: MatchData[],
  ) => MatchStateResponse<S>;

  type MatchTerminateFunction<S> = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    dispatcher: Dispatcher,
    tick: number,
    state: S,
    reason: string,
  ) => MatchStateResponse<S>;

  interface MatchmakerResultTicket {
    string_properties?: Record<string, string>;
  }

  interface MatchmakerEntry {
    ticket: MatchmakerResultTicket;
  }

  type MatchmakerMatchedFunction = (
    context: Context,
    logger: Logger,
    nk: Nakama,
    matches: MatchmakerEntry[],
  ) => string | null;

  type MatchCreateFunction<S> = (context: Context, logger: Logger, nk: Nakama, params: Record<string, unknown>) => MatchHandler<S>;

  interface MatchHandler<S> {
    matchInit: MatchInitFunction<S>;
    matchJoinAttempt: MatchJoinAttemptFunction<S>;
    matchJoin: MatchJoinFunction<S>;
    matchLeave: MatchLeaveFunction<S>;
    matchLoop: MatchLoopFunction<S>;
    matchTerminate: MatchTerminateFunction<S>;
  }

  interface Initializer {
    registerMatch<T>(name: string, createFn: MatchCreateFunction<T>): void;
    registerMatchmakerMatched(name: string, fn: MatchmakerMatchedFunction): void;
  }

  interface Nakama {
    matchCreate(module: string, params?: Record<string, unknown>): string;
  }

  type InitModule = (ctx: Context, logger: Logger, nk: Nakama, initializer: Initializer) => void;
}

export {};

declare global {
  var InitModule: import('@heroiclabs/nakama-runtime').InitModule;
}
