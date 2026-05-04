const { Pool } = require('pg');
const config = require('../config/env');
const winston = require('winston');
require("../config/logger")();

const pool = new Pool({ connectionString: process.env.NODE_ENV == 'development' ? config.POSTGRES_DEV_URI : (process.env.NODE_ENV == 'test' ? config.POSTGRES_TEST_URI : config.POSTGRES_URI) });

const createIndexes = async () => {
    winston.info('Creating indexes...');

    try {
        // Single column indexes for common individual filters
        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_gender
            ON profiles(gender);
        `);
        winston.info('idx_profiles_gender');

        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_country_id
            ON profiles(country_id);
        `);
        winston.info('idx_profiles_country_id');

        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_age_group
            ON profiles(age_group);
        `);
        winston.info('idx_profiles_age_group');

        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_age
            ON profiles(age);
        `);
        winston.info('idx_profiles_age');

        // Composite indexes for most common combined filters
        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_gender_country
            ON profiles(gender, country_id);
        `);
        winston.info('idx_profiles_gender_country');

        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_gender_age_group
            ON profiles(gender, age_group);
        `);
        winston.info('idx_profiles_gender_age_group');

        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_country_age_group
            ON profiles(country_id, age_group);
        `);
        winston.info('idx_profiles_country_age_group');

        // For sorting by most common sort field
        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at
            ON profiles(created_at DESC);
        `);
        winston.info('idx_profiles_created_at');

        // For name lookups (used in duplicate checks during ingestion)
        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_name
            ON profiles(name);
        `);
        winston.info('idx_profiles_name');

        // Partial indexes for probability filters. Smart indexes that indexes rows where the column is not null
        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_gender_prob
            ON profiles(gender_probability)
            WHERE gender_probability IS NOT NULL;
        `);
        winston.info('idx_profiles_gender_prob');

        await pool.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_country_prob
            ON profiles(country_probability)
            WHERE country_probability IS NOT NULL;
        `);
        winston.info('idx_profiles_country_prob');

        winston.info('All indexes created successfully');
    } catch (err) {
        winston.error('❌ Index creation failed:', err.message);
    } finally {
        await pool.end();
    }
};

createIndexes();