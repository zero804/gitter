"use strict";

/* For development only */

/* Configure winston before all else! */
var env = require('gitter-web-env');
var winston = env.logger;

winston.info('Starting server/web.js');

var express  = require('express');
var http     = require('http');
var cors = require('cors');
var app = express();

var server = http.createServer(app);

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

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

require('./web/express-static').install(app);

var port = 5005;

server.listen(port, function() {
  winston.info("Listening on " + port);
});
