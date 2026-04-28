const { Pool } = require("pg");
const config = require("../../config");

module.exports = async () => {
    const pool = new Pool({
        connectionString: config.POSTGRES_TEST_URI
    });

    try {
        // create tables in test DB before any tests run
        await pool.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                gender VARCHAR(10),
                gender_probability FLOAT,
                sample_size INTEGER,
                age INTEGER,
                age_group VARCHAR(20),
                country_id VARCHAR(2),
                country_name VARCHAR(255),
                country_probability FLOAT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                github_id VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                email VARCHAR(255),
                avatar_url VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
    } finally {
        await pool.end();
    }

};