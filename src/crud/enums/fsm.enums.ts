export class FsmMode {
  static readonly STRICT = 'strict';
  static readonly LENIENT = 'lenient';
}

export enum FsmJobState {
  INITIAL = 'initial',
  PROCESSING = 'processing',
  STUCK = 'stuck',
  FINAL = 'final',
}

/**
 * Generic FSM processing states.
 * These are common states that can be used across all FSM implementations.
 * Each module should define its own specific step names as strings.
 */
export class FsmProcessingState {
  static readonly EXIT = 'exit';
  static readonly START = 'init';
  static readonly UNKNOWN = 'unknown';
}
