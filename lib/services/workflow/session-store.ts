import { redisClient } from '@/lib/redis/client';

export class WorkflowSessionStore {
  private readonly TTL = 3600; // 1 hour default

  /**
   * Store workflow context for a session
   */
  async setContext(sessionId: string, context: any, ttlSeconds?: number): Promise<void> {
    const key = `workflow:session:${sessionId}:context`;
    const ttl = ttlSeconds || this.TTL;
    
    try {
      const redis = redisClient.getPublisher();
      await redis.setex(key, ttl, JSON.stringify(context));
    } catch (error) {
      console.error('Failed to set workflow context:', error);
      throw new Error('Failed to store workflow context');
    }
  }

  /**
   * Get workflow context for a session
   */
  async getContext(sessionId: string): Promise<any> {
    const key = `workflow:session:${sessionId}:context`;
    
    try {
      const redis = redisClient.getPublisher();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get workflow context:', error);
      return {};
    }
  }

  /**
   * Update workflow context (merge with existing)
   */
  async updateContext(
    sessionId: string,
    updates: any,
    ttlSeconds?: number
  ): Promise<any> {
    const current = await this.getContext(sessionId);
    const updated = { ...current, ...updates };
    await this.setContext(sessionId, updated, ttlSeconds);
    return updated;
  }

  /**
   * Store step-specific data
   */
  async setStepData(
    sessionId: string,
    stepId: string,
    data: any,
    ttlSeconds?: number
  ): Promise<void> {
    const key = `workflow:session:${sessionId}:step:${stepId}`;
    const ttl = ttlSeconds || this.TTL;
    
    try {
      const redis = redisClient.getPublisher();
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to set step data:', error);
      throw new Error('Failed to store step data');
    }
  }

  /**
   * Get step-specific data
   */
  async getStepData(sessionId: string, stepId: string): Promise<any | null> {
    const key = `workflow:session:${sessionId}:step:${stepId}`;
    
    try {
      const redis = redisClient.getPublisher();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get step data:', error);
      return null;
    }
  }

  /**
   * Clear all session data for a workflow
   */
  async clearSession(sessionId: string): Promise<void> {
    const pattern = `workflow:session:${sessionId}:*`;
    
    try {
      const redis = redisClient.getPublisher();
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
      // Don't throw - this is cleanup, continue even if it fails
    }
  }

  /**
   * Extend session TTL (user is still active)
   */
  async extendSession(sessionId: string, ttlSeconds?: number): Promise<void> {
    const pattern = `workflow:session:${sessionId}:*`;
    const ttl = ttlSeconds || this.TTL;
    
    try {
      const redis = redisClient.getPublisher();
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        await redis.expire(key, ttl);
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      // Don't throw - this is best-effort
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const key = `workflow:session:${sessionId}:context`;
    
    try {
      const redis = redisClient.getPublisher();
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Failed to check session existence:', error);
      return false;
    }
  }

  /**
   * Get remaining TTL for session
   */
  async getSessionTTL(sessionId: string): Promise<number> {
    const key = `workflow:session:${sessionId}:context`;
    
    try {
      const redis = redisClient.getPublisher();
      const ttl = await redis.ttl(key);
      return ttl;
    } catch (error) {
      console.error('Failed to get session TTL:', error);
      return -1;
    }
  }
}

export const workflowSessionStore = new WorkflowSessionStore();
