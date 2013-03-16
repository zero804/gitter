/*jshint unused:true, browser:true*/
define([
  'jquery',
  'faye'
], function($, Faye) {
  /*global console:true*/
  "use strict";

  Faye.Logging.logLevel = 'debug';

  var connected = false;
  var connectionProblemTimeoutHandle;
  var persistentOutage = false;


  function connectionProblemTimeout() {
    connectionProblemTimeoutHandle = null;

    // If there was a timing issue
    if(connected) {
      if(persistentOutage) {
        persistentOutage = false;
        $(document).trigger('realtime:persistentOutageCleared');
      }

      return;
    }

    if(!persistentOutage) {
      persistentOutage = true;
      $(document).trigger('realtime:persistentOutage');
    }
  }

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

  client.connect(function() {});

  client.addExtension(new ClientAuth());

  client.bind('transport:down', function() {
    console.log('transport:down');
    connected = false;

    if(!connectionProblemTimeoutHandle) {
      connectionProblemTimeoutHandle = window.setTimeout(connectionProblemTimeout, 5000);
    }

    // the client is not online
    $(document).trigger('realtime:down');
  });

  client.bind('transport:up', function() {
    console.log('transport:up');
    connected = true;

    if(connectionProblemTimeoutHandle) {
      window.clearTimeout(connectionProblemTimeoutHandle);
      connectionProblemTimeoutHandle = null;
    }

    // the client is online
    $(document).trigger('realtime:up');

    // Long term outage
    if(persistentOutage) {
      persistentOutage = false;
      $(document).trigger('realtime:persistentOutageCleared');
    }
  });

  // Give the initial load 5 seconds to connect before warning the user that there is a problem
  connectionProblemTimeoutHandle = window.setTimeout(connectionProblemTimeout, 5000);

  return client;
});