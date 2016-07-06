#!/usr/bin/env node
'use strict';

var typeahead = require('../../server/services/typeaheads/user-typeahead-elastic');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var shutdown = require('shutdown');

onMongoConnect()
  .then(function() {
    return typeahead.reindex();
  })
  .then(function() {
    console.log('DONE');
  })
  .catch(function(err) {
    console.error("error:", err);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
