const winston = require("winston");

module.exports = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        winston.info(`${req.method} ${req.url} - ${duration}ms`);

        if (duration > 500) {
            winston.warn(`Slow response detected: ${req.method} ${req.url} took ${duration}ms`);
        }
    });

    next();
};