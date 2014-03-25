/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require('../utils/winston');
var assert = require('assert');
var appEvents = require('../app-events');

module.exports = {
  confirmSignup: function(user, callback) {
    assert(user, 'user required');
    winston.verbose("Confirming user", { id: user.id, status: user.status });

    if (user.status === 'UNCONFIRMED') {
      user.status = 'PROFILE_NOT_COMPLETED';
    }

    return user.saveQ()
        .then(function() {
          // Signal that an email address has been confirmed
          appEvents.emailConfirmed(user.email, user.id);

          return user;
        })
        .nodeify(callback);

  }
};
