const { Pool } = require("pg");
const config = require("../config");
const winston = require("winston");

const pool = new Pool({
    connectionString: (process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'test') ? config.POSTGRES_TEST_URI : config.POSTGRES_URI,
});

pool.on("error", (err) => {
    winston.error("Unexpected error on idle client", err);
    process.exit(-1);
});

pool.on("connect", () => {
    winston.info("Database connection established");
});

module.exports = pool;