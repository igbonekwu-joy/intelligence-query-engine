const { uuidv7 } = require("uuidv7");
const data = require("../../config/seed/seed_profiles.json");
const pool = require("../../config/database");
const winston = require("winston");
require("../../config/logger")();

const seed = async () => {
  try {
    winston.info("Starting seeding process...");

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