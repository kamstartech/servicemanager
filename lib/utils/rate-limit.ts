/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Unique identifier for this rate limit (e.g., 'graphql', 'api')
   */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check if request is within rate limit
 * @param key - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const identifier = config.identifier || 'default';
  const rateLimitKey = `${identifier}:${key}`;
  
  let entry = store.get(rateLimitKey);
  
  // Initialize or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(rateLimitKey, entry);
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment counter
  entry.count++;
  
  // Check if exceeded
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit info without incrementing counter
 */
export function getRateLimitInfo(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const identifier = config.identifier || 'default';
  const rateLimitKey = `${identifier}:${key}`;
  
  const entry = store.get(rateLimitKey);
  
  if (!entry || entry.resetAt < now) {
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
    };
  }
  
  return {
    success: entry.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string, identifier = 'default'): void {
  const rateLimitKey = `${identifier}:${key}`;
  store.delete(rateLimitKey);
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP from headers (works with proxies)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a default
  return 'unknown';
}
