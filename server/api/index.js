'use strict';

var express = require('express');
var cors = require('cors');
var env = require('gitter-web-env');

// API uses CORS
var corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  maxAge: 600, // 10 minutes
  allowedHeaders: [
    'content-type',
    'x-access-token',
    'accept'
  ],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/', function(req, res) {
  res.redirect('https://developer.gitter.im');
});

router.use(cors(corsOptions));
router.options('*', cors(corsOptions));

router.use('/v1', require('./v1'));
router.use('/private', require('./private'));


/* Catch all - return 404 error */
router.get('/*', function(req, res, next) {
  return next(404);
});

// Error Handlers
router.use('/', require('../web/middlewares/token-error-handler'));
router.use('/', env.middlewares.errorHandler);

module.exports = router;
