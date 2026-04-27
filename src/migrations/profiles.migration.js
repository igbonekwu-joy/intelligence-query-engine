const winston = require("winston");
const pool = require("../startup/database");
require("../startup/logger")();

const createProfilesTable = async () => {
    try {
        winston.info("Creating profiles table...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY,
                name VARCHAR(255) UNIQUE,
                gender VARCHAR(255),
                gender_probability FLOAT,
                sample_size INT,
                age INT,
                age_group VARCHAR(255),
                country_id VARCHAR(2),
                country_name VARCHAR(255),
                country_probability FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        winston.info("Profiles table created successfully");
    }
    catch (error) {
        winston.error("Error creating profiles table:", error);
    }
    finally {
        await pool.end();
    }
}

createProfilesTable();