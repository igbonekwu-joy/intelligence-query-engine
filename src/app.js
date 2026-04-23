const express = require('express');
const config = require('./config');
const winston = require('winston');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
const { default: helmet } = require('helmet');
const compression = require('compression');
const timeout = require('connect-timeout');
const responseTimeHandler = require('./middleware/responseTimeHandler');

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

require('./startup/routes')(app);
require('./startup/logger')();

app.use(errorHandler); //must be registered after routes
app.use(responseTimeHandler);

app.use(timeout('10s')); // abort requests that take longer than 10 seconds
app.use((req, res, next) => {
  if (!req.timedout) next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});