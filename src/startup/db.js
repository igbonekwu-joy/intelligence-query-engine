const mongoose = require("mongoose");
const winston = require("winston");
const config = require("../config");

const db = process.env.NODE_ENV == 'development' ? config.DB_TEST_URI : config.DB_URI;

module.exports = function () {
    mongoose.connect(db)
    .then(() => winston.info(`Connected to ${db}`));
} 