#!/usr/bin/env node
/*jslint node: true, unused:true */
"use strict";

var shutdown = require('shutdown');
var env = require('../../server/utils/env');
var userService = require('../../server/services/user-service');

env.installUncaughtExceptionHandler();

var CliOutput = require('./cli-output');

var cliOutput = new CliOutput({
  userId: { width: 32 },
  username: { width: 20 }
}, {
  all: { flag: true },
  usernames: { flag: true },
  userIds: { flag: true, default: true }
});

var opts = cliOutput.opts;

function die(err) {
  if(err) {
    console.error(err);
  }

  shutdown.shutdownGracefully(err ? 1 : 0);
}

cliOutput.headers();

function find(callback) {
  if(opts.usernames) {
    userService.findByUsernames(opts._, callback);
  } else {
    userService.findByIds(opts._, callback);
  }
}

find(function(err, users) {
  if(err) return die(err);

  users.forEach(function(user) {
    cliOutput.row({
      userId: user.id,
      username: user.username
    });
  });

  die();

});


