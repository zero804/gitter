#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var collections = require('../../server/utils/collections');
var presence = require('gitter-web-presence');
var _ = require('lodash');

var shutdown = require('shutdown');

var opts = require("nomnom")
  .option('userId', {
    position: 0,
    required: true,
    help: "userId of user to list presence for"
  })
  .parse();

var sockets;
presence.listAllSocketsForUser(opts.userId)
  .then(function(socketIds) {
    return presence.getSockets(socketIds);
  })
  .then(function(_sockets) {
    //console.log(_sockets);
    sockets = _.sortBy(_.values(_sockets), 'createdTime');
    var troupeIds = _.pluck(sockets, 'troupeId');
    return troupeService.findByIdsLean(troupeIds, {id: 1, uri: 1});
  })
  .then(function(troupes) {
    // just modify it in place
    var troupeHash = collections.indexById(troupes);
    sockets.forEach(function(socket) {
      socket.troupe = troupeHash[socket.troupeId] && troupeHash[socket.troupeId].uri;
      // this is all the same anyway
      delete socket.userId;
    });
    console.log(sockets);
    console.log(_.countBy(sockets, 'createdTime'));
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
