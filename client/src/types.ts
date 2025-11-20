export type Mark = 'X' | 'O';

export interface Assignment {
  userId: string;
  username: string;
  mark: Mark;
}

export interface MatchStatePayload {
  board: (Mark | null)[];
  currentTurn: Mark | null;
  winner: Mark | null;
  isDraw: boolean;
  matchOver: boolean;
  assignments: Assignment[];
  createdAt: string;
}

export const enum OpCode {
  STATE = 1,
  MOVE = 2,
  ERROR = 3,
}
