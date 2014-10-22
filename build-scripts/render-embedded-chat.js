#!/usr/bin/env node
/* jshint node:true */
"use strict";

var express  = require('express');
var fs       = require('fs');
var http     = require('http');
var redis    = require('../server/utils/redis');

var opts = require("nomnom")
  .option('output', {
     abbr: 'o',
     required: true,
     help: 'Output'
  })
  .parse();

function die(err) {
  console.error('Unable to render', err);
  process.exit(1);
}
/* Load express-resource */
require('express-resource');

var app = express();

var server = http.createServer(app);

require('../server/web/graceful-shutdown').install(server, app);

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore({
  client: redis.getClient()
});

require('../server/web/express').installFull(app, server, sessionStore);

app.render('mobile/native-embedded-chat-app', {}, function(err, html) {
  if(err) return die(err);

  fs.writeFileSync(opts.output, html, { encoding: 'utf8' });
  process.exit(0);
});


