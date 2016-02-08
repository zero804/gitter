#!/usr/bin/env node
/*jslint node: true */
"use strict";

var winston = require('../../server/utils/winston');
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');

var BayeuxCluster = require('../../server/web/bayeux/cluster');
var bayeux = new BayeuxCluster(true); // Lightweight bayeux cluster

presenceService.collectGarbage(bayeux, function(err) {
  if(err) winston.error('Error while validating sockets' + err, { exception: err });

  shutdown.shutdownGracefully();

});
