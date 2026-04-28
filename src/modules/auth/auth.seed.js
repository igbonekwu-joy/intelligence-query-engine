const winston = require('winston');
const pool = require('../../config/database');

require("../../config/logger")();

const makeAdmin = async () => {
    const githubUsername = process.argv[2]; // get username from argument

    if (!githubUsername) {
        winston.error('❌ Usage: node src/scripts/make-admin.js <github_username>');
        process.exit(1);
    }

    try {
        const result = await pool.query(
            `UPDATE users SET role = 'admin' 
             WHERE username = $1 
             RETURNING id, username, email, role`,
            [githubUsername]
        );

        if (result.rows.length === 0) {
            winston.error(`User "${githubUsername}" not found. Make sure they have logged in at least once.`);
            process.exit(1);
        }

        winston.info(`✅ User "${githubUsername}" has been promoted to admin:`);
    } catch (err) {
        winston.error('Failed:', err.message);
    } finally {
        await pool.end();
    }
};

makeAdmin();