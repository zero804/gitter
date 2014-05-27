/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var bayeuxExtension   = require('./extension');

module.exports = bayeuxExtension({
  name: 'pushOnly',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    if (message.channel == '/api/v1/ping2' || message.channel.match(/^\/meta\//)) {
      return callback(null, message);
    }

    return callback({ status: 403, message: "Push access denied" });
  },
});



