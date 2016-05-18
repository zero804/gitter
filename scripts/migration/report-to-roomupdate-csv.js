#!/usr/bin/env node

'use strict';

var JSONStream = require('JSONStream');
var es = require('event-stream');
var fs = require('fs');
var csv = require('fast-csv')
var csvStream = csv.createWriteStream({headers: true})
var writableStream = fs.createWriteStream("room-updates.csv");

var t = es.through(function write(data) {
  data.forEach(function(update) {
    if (update.type == 'rename-room') {
      this.emit('data', update);
    }
  }, this)
});

fs.createReadStream('/Users/leroux/owner-report.json')
  .pipe(JSONStream.parse('updates'))
  .pipe(t)
  .pipe(csvStream)
  .pipe(writableStream);
