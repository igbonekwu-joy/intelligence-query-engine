const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const jwt = require("jsonwebtoken");

const authRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 11, // 10 requests per minute
    legacyHeaders: false,
    standardHeaders: true,
    statusCode: 429,
    message: { status: 'error', message: 'Too Many Requests' },

    keyGenerator: (req) => {
        const realIp =
            req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.headers['x-real-ip'] ||
            req.ip;
        return realIp;
    }
});

const otherRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 60, // 60 requests per minute
    legacyHeaders: false,
    standardHeaders: true,
    statusCode: 429,
    message: { status: 'error', message: 'Too Many Requests' },

    keyGenerator: (req) => {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, env.JWT_SECRET);
                return decoded.id;
            }
        } catch {
            // ignore errors and fallback to IP
        }
        return rateLimit.ipKeyGenerator(req); // ← replaces req.ip
    }
});

module.exports = {
    authRateLimit,
    otherRateLimit
}