
import Redis from "ioredis";

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
});

const CHANNEL = "TICKET_MESSAGE_ADDED";

console.log(`🎧 Listening for events on channel: ${CHANNEL}...`);

redis.subscribe(CHANNEL, (err, count) => {
    if (err) {
        console.error("Failed to subscribe: %s", err.message);
    } else {
        console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
    }
});

redis.on("message", (channel, message) => {
    console.log(`Received message from ${channel}: %s`, message);
});
