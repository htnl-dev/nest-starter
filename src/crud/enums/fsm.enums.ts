/**
 * FSM mode for transition validation
 */
export enum FsmMode {
  /** Enforce transition rules strictly */
  STRICT = 'strict',
  /** Allow any transition */
  LENIENT = 'lenient',
}

/**
 * Common job processing states
 */
export enum JobState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
