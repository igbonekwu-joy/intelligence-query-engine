const { generateCSRFToken } = require("../utils/tokens");

const attachCSRF = (req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCSRFToken();
    }

    res.cookie('csrf_token', req.session.csrfToken, {
        httpOnly: false,        // so JS can read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

  next();
}

const csrf = (req, res, next) => {
    const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    // skip for safe methods
    if (SAFE_METHODS.includes(req.method)) return next();

    // skip for CLI — they use Bearer token not cookies
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) return next();

    const tokenFromSession = req.session.csrfToken;
    const tokenFromHeader = req.headers["x-csrf-token"];

    if (!tokenFromSession || !tokenFromHeader) {
        return res.status(403).json({
            status: "error",
            message: "Missing CSRF token"
        });
    }

    if (tokenFromSession !== tokenFromHeader) {
        return res.status(403).json({
            status: "error",
            message: "Invalid CSRF token"
        });
    }

    next();
}

module.exports = { attachCSRF, csrf };