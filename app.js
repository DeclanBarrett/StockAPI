// Express generator content
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require("dotenv").config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// Use swagger 
const swaggerUI = require('swagger-ui-express');
yaml = require('yamljs');
const swaggerDocument = yaml.load('./docs/swagger.yaml');

// Post Security
const helmet = require('helmet');
const cors = require('cors');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Use Knex
const options = require('./knexfile.js');
const knex = require('knex')(options);

app.use((req, res, next) => {
  req.db = knex;
  next();
})

// Additional Logging
logger.token('req', (req, res) => JSON.stringify(req.headers))
logger.token('res', (req, res) => {
 const headers = {}
 res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
 return JSON.stringify(headers)
})

// Default routers
app.use('/stocks/', indexRouter);
app.use('/user/', usersRouter);
app.use('/', swaggerUI.serve, swaggerUI.setup(swaggerDocument))

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
