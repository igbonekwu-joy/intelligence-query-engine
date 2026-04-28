const express = require('express');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
const { default: helmet } = require('helmet');
const compression = require('compression');
const timeout = require('connect-timeout');
const responseTimeHandler = require('./middleware/responseTimeHandler');
const session = require('express-session');

const app = express();
const PORT = config.PORT;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(compression()); 

app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      httpOnly: true,  
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
}));
app.use(responseTimeHandler); // must be registered before routes to capture response times

require('./routes')(app);
require('./config/logger')();

app.use(errorHandler); //has to be registered after routes

app.use(timeout('10s')); // abort requests that take longer than 10 seconds
app.use((req, res, next) => {
  if (!req.timedout) next();
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = server;