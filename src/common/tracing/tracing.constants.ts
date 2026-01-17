export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const CORRELATION_ID_KEY = 'correlationId';
export const EVENT_TYPE_KEY = 'eventType';
export const JOB_NAME_KEY = 'jobName';

export type EventType = 'http' | 'cron' | 'queue';
