const { default: rateLimit } = require("express-rate-limit");

module.exports = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' }
});