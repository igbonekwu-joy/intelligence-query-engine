const { Pool } = require("pg");
const config = require("../config");
const winston = require("winston");

const pool = new Pool({
    connectionString: config.POSTGRES_URI,
});

pool.on("error", (err) => {
    winston.error("Unexpected error on idle client", err);
    process.exit(-1);
});

pool.on("connect", () => {
    winston.info("Database connection established");
});

module.exports = pool;