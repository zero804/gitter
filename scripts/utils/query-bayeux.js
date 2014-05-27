#!/usr/bin/env node
/*jslint node: true, unused:true */
"use strict";

var shutdown = require('shutdown');
var opts = require('nomnom').parse();
var async = require('async');

var CliOutput = require('./cli-output');

var cliOutput = new CliOutput({
  socketId: { width: 32 },
  bayeux: { width: 8 },
  userId: { width: 24 },
  troupeId: { width: 24 },
  eyeballs: { width: 8 },
  mobile: { width: 8 },
  createdTime: { width: 25 },
  clientType: { width: 10 }
});

require('../../server/utils/event-listeners').installLocalEventListeners();


if(opts._.length === 0) {
  shutdown.shutdownGracefully();
} else {
  var presenceService = require('../../server/services/presence-service');
  var bayeux = require('../../server/web/bayeux');

  async.parallel([
      function(cb) {
        async.parallel(opts._.map(function(socketId) {
          return function(cb) {
            bayeux.engine.clientExists(socketId, function(exists) {
              return cb(null, exists);
            });
          };
        }), function(err, existence) {
          if(err) return cb(err);

          var result = opts._.reduce(function(result, socketId, index) {
            result[socketId] = existence[index];
            return result;
          }, {});

          return cb(null, result);
        });
      },
      function(cb) { presenceService.getSockets(opts._, cb); },
    ], function(err, results) {
      if(err) {
        console.error(err);
        return shutdown.shutdownGracefully(1);
      }
      cliOutput.headers();

      var clientExists = results[0];
      var sockets = results[1];

      opts._.forEach(function(socketId) {
        var socketInfo = sockets[socketId];

        cliOutput.row({
          socketId: socketId,
          bayeux: clientExists[socketId] ? 1 : 0,
          userId: socketInfo && socketInfo.userId,
          troupeId: socketInfo && socketInfo.troupeId,
          eyeballs: socketInfo && (socketInfo.eyeballs ? 1 : 0),
          mobile: socketInfo && (socketInfo.mobile ? 1 : 0),
          createdTime: socketInfo && socketInfo.createdTime.toISOString(),
          clientType: socketInfo && socketInfo.clientType
        });

      });

      return shutdown.shutdownGracefully();

    });

}

