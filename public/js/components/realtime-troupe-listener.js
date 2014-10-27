define([
  'utils/context',
  './realtime',
  'utils/appevents'
], function(context, realtime, appEvents) {
  "use strict";

  var subscription;

  context.troupe().watch('change:id', function(troupe) {
    if(subscription) {
      subscription.cancel();
      subscription = null;
    }

    if(troupe.id) {
      var client = realtime.getClient();

      subscription = client.subscribe('/v1/rooms/' + troupe.id, function(message) {
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


});
