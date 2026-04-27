const { StatusCodes } = require("http-status-codes");
const config = require("../config");
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: "error", message: "Access token is required" });
    }

    const apiVersion = req.headers['x-api-version'];
    if (!apiVersion || apiVersion !== config.API_VERSION) {
        return res.status(StatusCodes.BAD_REQUEST).json({ status: "error", message: "API version header required" });
    }

    const token = header.split(' ')[1];
    try{
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;

        if (req.user.is_active === false) {
            return res.status(StatusCodes.FORBIDDEN).json({ status: "error", message: "User account is not active" });
        }

        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(StatusCodes.UNAUTHORIZED).json({ status: "error", message: "Access token has expired" });
        }
        
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: "error", message: "Invalid access token" });
    }
}

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(StatusCodes.UNAUTHENTICATED).json({ status: "error", message: "User not authenticated" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ status: "error", message: "Access denied" });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize
}