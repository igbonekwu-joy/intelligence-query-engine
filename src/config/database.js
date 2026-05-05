const { Pool } = require("pg");
const config = require("./env");
const winston = require("winston");

const pool = new Pool({
    connectionString: process.env.NODE_ENV == 'development' ? config.POSTGRES_DEV_URI : (process.env.NODE_ENV == 'test' ? config.POSTGRES_TEST_URI : config.POSTGRES_URI),

    // Pool sizing. It maintains 10 reusable connections
    max: parseInt(process.env.DB_POOL_MAX) || 10,
 
    // How long to wait for a connection from the pool before erroring
    connectionTimeoutMillis: 5000,
 
    // How long an idle connection stays in the pool before being closed
    idleTimeoutMillis: 30000,
 
    // How long a query can run before being cancelled
    statement_timeout: 10000,
});

pool.on("error", (err) => {
    winston.error("Unexpected error on idle client", err);
    process.exit(-1);
});

pool.on("connect", () => {
    winston.info("Database connection established");
});

module.exports = pool;