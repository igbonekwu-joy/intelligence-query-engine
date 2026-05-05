const redis = require('redis');
const winston = require('winston');

let client = null;

const getClient = async () => {
    if (client && client.isOpen) return client;

    //create redis client
    client = redis.createClient({
        url: process.env.REDIS_DB_URL || 'redis://localhost:6379',
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) return new Error('Redis max retries reached');
                return Math.min(retries * 100, 3000); //exponential back off. It waits before trying and retrial time increases by 100ms
            }
        }
    });

    client.on('error', (err) => {
        winston.error('Redis error:', err.message);
    });

    client.on('connect', () => {
        winston.info('Redis connected');
    });

    await client.connect(); // opens the connection to redis
    return client;
};

// Get cached value — returns null on miss or error
const cacheGet = async (key) => {
    try {
        const connection = await getClient();
        const val = await connection.get(key);
        return val ? JSON.parse(val) : null;
    } catch (err) {
        winston.warn('Cache GET failed (falling through to DB):', err.message);
        return null; // graceful fallback — never crash on cache failure
    }
};

// Set cached value with TTL in seconds
const cacheSet = async (key, value, ttlSeconds = 300) => {
    try {
        const connection = await getClient();
        await connection.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
        winston.warn('Cache SET failed:', err.message);
    }
};

// Delete a specific key
const cacheDel = async (key) => {
    try {
        const connection = await getClient();
        await connection.del(key);
    } catch (err) {
        winston.warn('Cache DEL failed:', err.message);
    }
};

// Delete all keys matching a pattern (used after ingestion)
const cacheFlushPattern = async (pattern) => {
    try {
        const connection = await getClient();
        const keys = await connection.keys(pattern);
        if (keys.length > 0) {
            await connection.del(keys);
            winston.info(`Cache flushed ${keys.length} keys matching: ${pattern}`);
        }
    } catch (err) {
        winston.warn('Cache flush failed:', err.message);
    }
};

module.exports = { cacheGet, cacheSet, cacheDel, cacheFlushPattern };