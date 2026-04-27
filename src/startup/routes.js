const express = require('express');
const userData = require('../modules/profile/user-data.routes');
const authRoutes = require('../modules/auth/auth.routes');
const rateLimitHandler = require('../middleware/rateLimitHandler');
const { authenticate } = require('../middleware/authenticationHandler');

module.exports = function (app) {
    app.use(express.json()); 
    app.use(express.urlencoded({extended: true}));

    app.use(rateLimitHandler);

    app.use('/auth', authRoutes); 
    app.use('/api/profiles', authenticate, userData);
}