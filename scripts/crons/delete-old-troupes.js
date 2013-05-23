#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var demolitionService = require('../../server/services/troupe-demolition-service');
var shutdown = require('../../server/utils/shutdown');

demolitionService.deleteEligibleTroupes(function(err, counts) {
  if(err) {
    console.error(err);
    process.exit(1);
    return;
  }

  if(counts) {
    console.log(counts);
  }

  shutdown.shutdownGracefully();
});