const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    PORT: process.env.PORT || 5000,
    GENDERIZE_API_URL: process.env.GENDERIZE_API_URL,
    AGIFY_API_URL: process.env.AGIFY_API_URL,
    NATIONALIZE_API_URL: process.env.NATIONALIZE_API_URL,
    POSTGRES_URI: process.env.POSTGRES_URI,
    POSTGRES_TEST_URI: process.env.POSTGRES_TEST_URI,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI: process.env.GITHUB_CALLBACK_URL,
    GITHUB_STATE_STRING: process.env.GITHUB_STATE_STRING,
    GITHUB_ACCESS_TOKEN_URL: process.env.GITHUB_ACCESS_TOKEN_URL,
    GITHUB_USER_API_URL: process.env.GITHUB_USER_API_URL,
    SESSION_SECRET: process.env.SESSION_SECRET
}