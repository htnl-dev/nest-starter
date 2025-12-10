import { ClientSession } from 'mongoose';

/**
 * Transition effect function type
 */
export type TransitionEffect<TContext = unknown> = (
  context: TContext,
  session?: ClientSession,
) => Promise<void>;

/**
 * Simple transition table type
 */
export type TransitionTable<TStatus extends string> = Record<
  TStatus,
  TStatus[]
>;

/**
 * FSM handler response for async processing
 */
export interface FsmHandlerResponse {
  nextStatus: string;
  delay?: number;
  metadata?: Record<string, unknown>;
}
