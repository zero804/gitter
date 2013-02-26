/*jshint unused:true browser:true*/
define([
  'jquery',
  'faye'
], function($, Faye) {
  /*global console:true*/
  "use strict";

  var connected = false;

  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    message.ext = message.ext || {};
    message.ext.token = window.troupeContext.accessToken;
    callback(message);
  };

  var c = window.troupeContext.websockets;
  var client = new Faye.Client(c.fayeUrl, c.options);
  if(c.disable) {
    for(var i = 0; i < c.length; i++) {
      client.disable(c.disable[i]);
    }
  }

  client.addExtension(new ClientAuth());

  client.bind('transport:down', function() {
    console.log('transport:down');
    connected = false;
    // the client is not online
    $(document).trigger('realtime:down');
  });

  client.bind('transport:up', function() {
    console.log('transport:up');
    connected = true;
    // the client is online
    $(document).trigger('realtime:up');
  });

  return client;
});