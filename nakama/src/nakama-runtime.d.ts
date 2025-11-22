declare interface Context {
  env: Record<string, string>;
}

declare interface Logger {
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

declare interface MatchPresence {
  user_id: string;
  session_id: string;
  username: string;
  node?: string;
}

declare interface MatchData {
  op_code: number;
  data?: Uint8Array;
  presence: MatchPresence;
}

declare interface MatchLabel {
  [key: string]: string | number | undefined;
}

declare interface Dispatcher {
  broadcastMessage(opCode: number, data: string | Uint8Array, presences?: MatchPresence[]): void;
}

declare interface MatchStateResponse<S> {
  state: S;
  tickRate?: number;
  label?: string;
  accept?: boolean;
  rejectMessage?: string;
  terminate?: boolean;
}

declare type MatchInitFunction<S> = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  dispatcher: Dispatcher,
  tick: number,
  state: S,
  data: string,
) => MatchStateResponse<S>;

declare type MatchJoinAttemptFunction<S> = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  dispatcher: Dispatcher,
  tick: number,
  state: S,
  presence: MatchPresence,
  metadata: Record<string, unknown>,
) => MatchStateResponse<S> & { accept: boolean; rejectMessage?: string };

declare type MatchJoinFunction<S> = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  dispatcher: Dispatcher,
  tick: number,
  state: S,
  presences: MatchPresence[],
) => MatchStateResponse<S>;

declare type MatchLeaveFunction<S> = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  dispatcher: Dispatcher,
  tick: number,
  state: S,
  presences: MatchPresence[],
) => MatchStateResponse<S>;

declare type MatchLoopFunction<S> = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  dispatcher: Dispatcher,
  tick: number,
  state: S,
  messages: MatchData[],
) => MatchStateResponse<S>;

declare type MatchTerminateFunction<S> = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  dispatcher: Dispatcher,
  tick: number,
  state: S,
  reason: string,
) => MatchStateResponse<S>;

declare interface MatchmakerResultTicket {
  string_properties?: Record<string, string>;
}

declare interface MatchmakerEntry {
  ticket: MatchmakerResultTicket;
}

declare type MatchmakerMatchedFunction = (
  context: Context,
  logger: Logger,
  nk: Nakama,
  matches: MatchmakerEntry[],
) => string | null;

declare interface MatchHandler<S> {
  matchInit: MatchInitFunction<S>;
  matchJoinAttempt: MatchJoinAttemptFunction<S>;
  matchJoin: MatchJoinFunction<S>;
  matchLeave: MatchLeaveFunction<S>;
  matchLoop: MatchLoopFunction<S>;
  matchTerminate: MatchTerminateFunction<S>;
}

declare interface Initializer {
  registerMatch<T>(name: string, handler: MatchHandler<T>): void;
  registerMatchmakerMatched(name: string, fn: MatchmakerMatchedFunction): void;
}

declare interface Nakama {
  matchCreate(module: string, params?: Record<string, unknown>): string;
  binaryToString(data: Uint8Array): string;
}

declare type InitModule = (ctx: Context, logger: Logger, nk: Nakama, initializer: Initializer) => void;

declare const nk: Nakama;
declare function InitModule(ctx: Context, logger: Logger, nk: Nakama, initializer: Initializer): void;
