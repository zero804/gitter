/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  outgoing: function(message, req, callback) {
    if (message.ext) delete message.ext.password;
    callback(message);
  }
};


