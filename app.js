// const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const csp = require('express-csp');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorcontroller = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// console.log(process.env.NODE_ENV);

//1) GLOBAL MIDDLEWARES

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

//set security for HTTP header
// app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

//development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limiter for same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this Ip, try after 1 hour',
});

app.use(limiter);

//Body Parsar, reading data form body to req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//parse data from the cookie
app.use(cookieParser());

//provide security against NoSql query injection
app.use(mongoSanitize());

//provide security against xss

app.use(xss());

//prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

//serving static files
// app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  // console.log('Hello from the middleware');
  next();
});

//testing middleware

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//3) ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!!`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server!!`);
  // (err.status = 'fail'), (err.statusCode = 404);
  // next(err);

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorcontroller);

module.exports = app;
