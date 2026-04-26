const jwt = require("jsonwebtoken");
const config = require("../config");
const crypto = require("crypto");
const pool = require("../startup/database");
const { uuidv7 } = require("uuidv7");

const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, github_id: user.github_id, username: user.username },
        config.JWT_SECRET,
        { expiresIn: "3m" }
    );
}
 
const generateRefreshToken = async (userId) => {
    const token = crypto.randomBytes(64).toString('hex');
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await pool.query(
        `INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
        [uuidv7(), userId, token, expires]
    );

    return token;
}

const regenerateRefreshToken = async (oldToken) => {
    const result = await pool.query(
        `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
        [oldToken]
    );

    if (result.rows.length === 0) return null;

    const { user_id } = result.rows[0];

    //delete old refresh token
    await pool.query(
        `DELETE FROM refresh_tokens WHERE token = $1`,
        [oldToken]
    );

    const userResult = await pool.query(
        `SELECT * FROM users WHERE id = $1`,
        [user_id]
    );
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user_id);

    return { accessToken, refreshToken, user };
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    regenerateRefreshToken
}