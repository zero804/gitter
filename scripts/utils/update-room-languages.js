#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var findRoomHumanLanguage = require('../../server/services/find-room-human-language');
var shutdown = require('shutdown');
var es = require('event-stream');

// @const
var QUERY_LIMIT = 0;

var stream = persistence.Troupe
  .find({
    lang: { $exists: false },
    security: 'PUBLIC'
  })
  .select({ _id: 1, uri: 1 })
  .sort({ userCount: -1 })
  .limit(QUERY_LIMIT)
  .stream();

stream.pipe(es.through(function(data) {
  console.log('HANDLING', data.uri);
  this.pause();

  var self = this;

  return findRoomHumanLanguage(data._id)
    .then(function(lang) {
      if (lang) {
        console.log('Updating ', data.uri, ' to ', lang);
        data.lang = lang;
        return persistence.Troupe.findOneAndUpdate({ _id: data._id }, { $set: { lang: lang } }).exec();
      }
    })
    .then(function() {
      self.emit('data', data);
      self.resume();
    })
    .catch(function(err) {
      self.emit('error', err);
      self.resume();
    })
    .done();

}, function() {
  console.log('DONE');
  shutdown.shutdownGracefully();
}));

stream.on('error', function (err) {
  console.log('err.stack:', err.stack);
});
