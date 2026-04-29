const express = require('express');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
const { default: helmet } = require('helmet');
const compression = require('compression');
const timeout = require('connect-timeout');
const responseTimeHandler = require('./middleware/responseTimeHandler');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { attachCSRF } = require('./middleware/csrfHandler');

const app = express();
const PORT = config.PORT;

app.use(cors({
  origin: process.env.WEB_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-version', 'X-CSRF-Token'],
  credentials: true
}));

app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(compression()); 
app.use(cookieParser());

app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true,
      sameSite: "lax"
    }
}));
app.use(attachCSRF);

app.use(responseTimeHandler); // must be registered before routes to capture response times

require('./routes')(app);
require('./config/logger')();

app.use(errorHandler); //has to be registered after routes

app.use(timeout('10s')); // abort requests that take longer than 10 seconds
app.use((req, res, next) => {
  if (!req.timedout) next();
});

module.exports = app;