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

  var client = new Faye.Client('/faye');
  client.addExtension(new ClientAuth());

  client.bind('transport:down', function() {
    connected = false;
    // the client is online
    console.log("TRANSPORT DOWN");
  });

  client.bind('transport:up', function() {
    connected = true;
    // the client is online
    console.log("TRANSPORT UP");
  });

  return client;
});
