import { createClient } from "redis";
import { AppError } from "@/lib/http";

type RedisClient = ReturnType<typeof createClient>;

let redisPromise: Promise<RedisClient> | null = null;

export async function getRedis(): Promise<RedisClient> {
  if (redisPromise) {
    return redisPromise;
  }

  if (!process.env.REDIS_URL) {
    throw new AppError(
      "REDIS_NOT_CONFIGURED",
      "Redis is not configured.",
    );
  }

  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 2_000),
    },
  });

  client.on("error", (error) => {
    console.error("Redis client error", error);
  });

  redisPromise = client.connect().then(() => client);

  return redisPromise;
}
