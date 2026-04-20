const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    PORT: process.env.PORT || 5000,
    GENDERIZE_API_URL: process.env.GENDERIZE_API_URL,
    AGIFY_API_URL: process.env.AGIFY_API_URL,
    NATIONALIZE_API_URL: process.env.NATIONALIZE_API_URL,
    DB_URI: process.env.DB_URI,
    DB_TEST_URI: process.env.DB_TEST_URI
}