/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  './realtime',
  'utils/appevents'
], function(context, realtime, appEvents) {
  "use strict";

  var subscription;

  context.user().watch('change:id', function(user) {
    if(subscription) {
      subscription.cancel();
      subscription = null;
    }

    if(user.id) {
      var client = realtime.getClient();

      subscription = client.subscribe('/user/' + user.id, function(message) {
        if (message.notification === 'user_notification') {
          appEvents.trigger('user_notification', message);
        }
      });
    }

  });


});
