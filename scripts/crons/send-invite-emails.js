#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var shutdown = require('../../server/utils/shutdown');
var inviteService = require('../../server/services/invite-service');

var delaySeconds = 10 * 60;
inviteService.sendPendingInviteMails(delaySeconds, function(err, counts) {
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