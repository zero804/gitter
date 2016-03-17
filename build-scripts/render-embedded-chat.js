#!/usr/bin/env node
/* jshint node:true */
"use strict";

var express       = require('express');
var fs            = require('fs');
var expressHbs    = require('express-hbs');
var resolveStatic = require('../server/web/resolve-static');

var opts = require('yargs')
  .option('output', {
     alias: 'o',
     required: true,
     description: 'Output'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

function die(err) {
  console.error('Unable to render', err);
  process.exit(1);
}

var app = express();
require('../server/web/register-helpers')(expressHbs);

app.engine('hbs', expressHbs.express3({
  partialsDir: resolveStatic('/templates/partials'),
  onCompile: function(exhbs, source) {
     return exhbs.handlebars.compile(source, { preventIndent: true });
  },
  layoutsDir: resolveStatic('/layouts'),
  contentHelperName: 'content'
}));

app.set('view engine', 'hbs');
app.set('views', resolveStatic('/templates'));

app.render('mobile/native-embedded-chat-app', {}, function(err, html) {
  if(err) return die(err);

  fs.writeFileSync(opts.output, html, { encoding: 'utf8' });
  process.exit(0);
});
