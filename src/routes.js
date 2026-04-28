const express = require('express');
const userData = require('./modules/profile/user-data.routes');
const authRoutes = require('./modules/auth/auth.routes');
const { authRateLimit, otherRateLimit} = require('./middleware/rateLimitHandler');
const { authenticate } = require('./middleware/authenticationHandler');

module.exports = function (app) {
    app.use(express.json()); 
    app.use(express.urlencoded({extended: true}));

    //app.use(rateLimitHandler);

    app.use('/auth', authRateLimit, authRoutes); 
    app.use('/api/profiles', otherRateLimit, authenticate, userData);
}