const winston = require("winston");
const pool = require("../config/database");
require("../config/logger")();

const createRefreshTokenTable = async () => {
    try{
        winston.info("Creating refresh_tokens table...");

        await pool.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY,
            token VARCHAR(255) UNIQUE NOT NULL,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );`);

        winston.info("refresh_tokens table created successfully");
    }
    catch (error) {
        winston.error("Error creating refresh_tokens table:", error);
    }
    finally {
       // await pool.end();
    }
}

createRefreshTokenTable();