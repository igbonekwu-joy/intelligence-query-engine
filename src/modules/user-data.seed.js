const { uuidv7 } = require("uuidv7");
const data = require("../seed/seed_profiles.json");
const pool = require("../startup/database");
const winston = require("winston");
require("../startup/logger")();

const seed = async () => {
  try {
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


    for (const profile of data.profiles) {
      await pool.query(
        `INSERT INTO profiles (id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO NOTHING`, // prevents duplicate errors on re-run
        [uuidv7(), profile.name, profile.gender, profile.gender_probability, profile.age, profile.age_group, profile.country_id, profile.country_name, profile.country_probability]
      );
    }
 
    winston.info("Seeding complete");
  } catch (err) {
    winston.error("Seeding failed:", err);
  } finally {
    await pool.end(); 
  }
};

seed();