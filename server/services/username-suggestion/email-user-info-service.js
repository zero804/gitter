/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

exports.lookupUsernameForEmail = function(email) {
  var username = email.split('@',1)[0];

  return { service: 'email', username: username };
};