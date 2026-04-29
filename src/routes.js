const express = require('express');
const userData = require('./modules/profile/user-data.routes');
const authRoutes = require('./modules/auth/auth.routes');
const { authRateLimit, otherRateLimit} = require('./middleware/rateLimitHandler');
const { authenticate } = require('./middleware/authenticationHandler');
const { getUser } = require('./modules/auth/auth.controller');
const asyncHandler = require('./middleware/asyncHandler');
const { csrf } = require('./middleware/csrfHandler');

module.exports = function (app) {
    app.use(express.json()); 
    app.use(express.urlencoded({extended: true}));

    //app.use(rateLimitHandler);

    app.use('/auth', authRateLimit, authRoutes); 
    app.get('/auth/me', authenticate, asyncHandler(getUser));  

    app.use('/api/profiles', otherRateLimit, authenticate, csrf, userData);
}