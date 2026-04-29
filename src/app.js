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
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);

const sessionPool = new Pool({
    connectionString: process.env.NODE_ENV == 'development' ? config.POSTGRES_DEV_URI : (process.env.NODE_ENV == 'test' ? config.POSTGRES_TEST_URI : config.POSTGRES_URI)
});

const app = express();

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
    store: new pgSession({
        pool: sessionPool,
        tableName: 'session', // auto-created
        createTableIfMissing: true,
    }),
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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