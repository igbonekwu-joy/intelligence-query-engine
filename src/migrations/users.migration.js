const winston = require("winston");
const pool = require("../startup/database");
require("../startup/logger")();

const createUsersTable = async () => {
    try {
        winston.info("Creating users table...");

        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            github_id VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(255),
            email VARCHAR(255),
            avatar_url VARCHAR(255),
            role VARCHAR(50) DEFAULT 'analyst',
            is_active BOOLEAN DEFAULT TRUE,
            last_login_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );`);

        winston.info("Users table created successfully");
    }
    catch (error) {
        winston.error("Error creating users table:", error);
    }
    finally {
        await pool.end();
    }
}

createUsersTable();