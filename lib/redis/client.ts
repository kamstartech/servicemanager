import Redis from "ioredis";

class RedisClient {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize connections
      this.getPublisher();
      this.getSubscriber();
      
      // Wait for connections to be ready
      await Promise.race([
        Promise.all([
          new Promise((resolve) => this.publisher!.once("ready", resolve)),
          new Promise((resolve) => this.subscriber!.once("ready", resolve)),
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Redis connection timeout")), 5000)
        ),
      ]);
      
      this.isInitialized = true;
      console.log("✅ Redis client initialized");
    } catch (error) {
      console.error("❌ Redis initialization failed:", error instanceof Error ? error.message : error);
      this.isInitialized = false;
    }
  }

  getPublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          if (times > 10) return null; // Stop retrying after 10 attempts
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      this.publisher.setMaxListeners(50);

      this.publisher.on("error", (err) => {
        // Only log if not a connection error during startup
        if (this.isInitialized) {
          console.error("❌ Redis Publisher Error:", err.message);
        }
      });

      this.publisher.on("connect", () => {
        console.log("✅ Redis Publisher connected");
      });

      this.publisher.on("ready", () => {
        console.log("✅ Redis Publisher ready");
      });

      // Start connection
      this.publisher.connect().catch(() => {});
    }
    return this.publisher;
  }

  getSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          if (times > 10) return null;
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      this.subscriber.setMaxListeners(50);

      this.subscriber.on("error", (err) => {
        if (this.isInitialized) {
          console.error("❌ Redis Subscriber Error:", err.message);
        }
      });

      this.subscriber.on("connect", () => {
        console.log("✅ Redis Subscriber connected");
      });

      this.subscriber.on("ready", () => {
        console.log("✅ Redis Subscriber ready");
      });

      // Start connection
      this.subscriber.connect().catch(() => {});
    }
    return this.subscriber;
  }

  async close() {
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.isInitialized = false;
    console.log("✅ Redis connections closed");
  }

  isConnected(): boolean {
    return this.isInitialized &&
      (this.publisher?.status === "ready" || this.publisher?.status === "connect") &&
      (this.subscriber?.status === "ready" || this.subscriber?.status === "connect");
  }
}

export const redisClient = new RedisClient();

// Initialize on module load
redisClient.initialize();
