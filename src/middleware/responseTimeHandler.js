const winston = require("winston");

module.exports = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        winston.info(`${req.method} ${req.originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`);

        if (duration > 500) {
            winston.warn(`Slow response detected: ${req.method} ${req.originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`);
        }
    });

    next();
};