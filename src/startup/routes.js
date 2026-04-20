const express = require('express');
const userData = require('../modules/user-data.routes');
const rateLimitHandler = require('../middleware/rateLimitHandler');

module.exports = function (app) {
    app.use(express.json()); 
    app.use(express.urlencoded({extended: true}));

    app.use(rateLimitHandler);

    app.use('/', userData);
}