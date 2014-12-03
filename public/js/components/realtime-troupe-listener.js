"use strict";
var context = require('utils/context');
var realtime = require('./realtime');
var appEvents = require('utils/appevents');
var apiClient = require('components/apiClient');

module.exports = (function() {


  var subscription;

  context.troupe().watch('change:id', function(troupe) {
    if(subscription) {
      subscription.cancel();
      subscription = null;
    }

    if(troupe.id) {
      // raw faye client
      var client = realtime.getClient();

      // raw faye client doesnt add the prefix like realtime.subscribe does
      var url = '/api' + apiClient.room.channel();

      subscription = client.subscribe(url, function(message) {
        if(message.notification === 'presence') {
          if(message.status === 'in') {
            appEvents.trigger('userLoggedIntoTroupe', message);
          } else if(message.status === 'out') {
            appEvents.trigger('userLoggedOutOfTroupe', message);
          }
        }
      });

    }

  });



})();

