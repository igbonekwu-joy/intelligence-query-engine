const { Pool } = require("pg");
const config = require("../../config/env");

module.exports = async () => {
    const pool = new Pool({
        connectionString: config.POSTGRES_TEST_URI
    });

    try {
        await pool.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
        await pool.query(`DROP TABLE IF EXISTS profiles CASCADE`);
        await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
    } finally {
        await pool.end(); 
    }
};