var faye = require('faye');
var oauth = require("../services/oauth-service");
var winston = require("winston");

var auth = {
  incoming: function(message, callback) {
    if (message.channel === '/meta/subscribe') {
      console.log("AUTH", message);
      this.authorized(message, function(err, allowed) {
        if(err || !allowed) {
          winston.error("Denying access to subscribe", { message: message, exception: err });
          message.error = '403::Access denied';
        }
      });
    }

    callback(message);
  },

  authorized: function(message, callback) {
    var ext = message.ext;
    if(!ext) return callback("No auth provided");

    var accessToken = ext.token;
    if(!accessToken) return callback("No auth provided");

    oauth.validateWebToken(accessToken, function(err, userId) {
      if(err) return callback("Validation failed: " + err);
      if(!userId) return callback("Invalid access token");

      console.log("Allowing ", userId, " to subscribe to ", message);
      return callback(null, true);
    });

  }
};

var pushOnlyServer = {
  password: 'some long and unguessable application-specific string',
  incoming: function(message, callback) {
    if (!message.channel.match(/^\/meta\//)) {
      var password = message.ext && message.ext.password;
      if (password !== this.password)
        message.error = '403::Password required';
    }
    callback(message);
  },

  outgoing: function(message, callback) {
    if (message.ext) delete message.ext.password;
    callback(message);
  }
};

var pushOnlyServerClient = {
  password: 'some long and unguessable application-specific string',

  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = this.password;
    callback(message);
  }
};

var server = new faye.NodeAdapter({ mount: '/faye', timeout: 45 });

var client = server.getClient();

server.addExtension(auth);

server.addExtension(pushOnlyServer);
client.addExtension(pushOnlyServerClient);

module.exports = {
  server: server,
  client: client
};