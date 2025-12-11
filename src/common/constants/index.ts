/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Cache configuration
 */
export const CACHE = {
  DEFAULT_TTL_SECONDS: 300, // 5 minutes
  SHORT_TTL_SECONDS: 60, // 1 minute
  LONG_TTL_SECONDS: 3600, // 1 hour
} as const;

/**
 * Transaction configuration
 */
export const TRANSACTION = {
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 20,
} as const;

/**
 * HTTP status code ranges for logging
 */
export const HTTP_STATUS = {
  SERVER_ERROR_MIN: 500,
  CLIENT_ERROR_MIN: 400,
} as const;
