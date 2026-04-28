const winston = require("winston");
const { createAxiosInstance } = require("../../utils/axios");
const config = require("../../config/env");
const { StatusCodes } = require("http-status-codes");
const pool = require("../../config/database");
const { uuidv7 } = require("uuidv7");

const axiosAuthInstance = createAxiosInstance(
  '/'
); 

const getGitHubAccessToken = async ({ code, verifier }) => {
    try{
        const data = {
            client_id: config.GITHUB_CLIENT_ID,
            client_secret: config.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: config.GITHUB_CALLBACK_URL,
            code_verifier: verifier,
        }

        const response = await axiosAuthInstance.post(`${config.GITHUB_ACCESS_TOKEN_URL}`, data);  
        return response.data.access_token;
    } catch (error) {
        winston.error("GitHub returned an invalid response", error);
        return { statusCode: StatusCodes.BAD_GATEWAY, message: "GitHub returned an invalid response" };
    }
}

const getGitHubUserProfile = async (accessToken) => {
    try{
        const response = await axiosAuthInstance.get(config.GITHUB_USER_API_URL, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return response.data;
    } catch (error) {
        winston.error("GitHub returned an invalid response", error);
        return { statusCode: StatusCodes.BAD_GATEWAY, message: "GitHub returned an invalid response" };
    }
}

const getGitHubUserEmail = async (accessToken) => {
    try {
        const response = await axiosAuthInstance.get(`${config.GITHUB_USER_API_URL}/emails`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const primary = response.data.find(e => e.primary && e.verified);
        return primary?.email || null;
    } catch (error) {
        winston.error("GitHub returned an invalid response", error);
        return { statusCode: StatusCodes.BAD_GATEWAY, message: "GitHub returned an invalid response" };
    }
}

const getOrCreateUser = async (profile, email) => {
    let userResult = await pool.query(
        `SELECT * FROM users WHERE github_id = $1`,
        [String(profile.id)]
    );

    let user;

    if (userResult.rows.length === 0) {
        const insertResult = await pool.query(
            `INSERT INTO users (id, github_id, username, email, avatar_url, role, last_login_at)
                VALUES ($1, $2, $3, $4, $5, 'analyst', NOW()) RETURNING *`,
            [uuidv7(), String(profile.id), profile.login, email, profile.avatar_url]
        );
        user = insertResult.rows[0];
    } else {
        userResult = await pool.query(
            `UPDATE users SET last_login_at = NOW() WHERE github_id = $1 RETURNING *`,
            [String(profile.id)]
        );
        user = userResult.rows[0];
    }

    return user;
}

const deleteRefreshToken = async (refreshToken) => {
    const result = await pool.query(
        `SELECT * FROM refresh_tokens WHERE token = $1`,
        [refreshToken]
    );
    if (result.rows.length === 0) return false;

    await pool.query(
        `DELETE FROM refresh_tokens WHERE token = $1`,
        [refreshToken]
    );

    return true;
}

module.exports = {
    getGitHubAccessToken,
    getGitHubUserProfile,
    getGitHubUserEmail,
    getOrCreateUser,
    deleteRefreshToken
}