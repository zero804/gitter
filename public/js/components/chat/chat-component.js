define([
  'jquery',
  'underscore',
  'now'
], function($, _, Backbone, nowStub){

  "use strict";

  var connected = false;
  var subscribeOnConnect = true;

  var module = {
    connect: function() {
      function createTrigger(name) {
        return function(message) {
          $(document).trigger(name, message);
        }
      }

      now.onTroupeChatMessage = createTrigger('chat');
      now.onUserLoggedIntoTroupe = createTrigger('userLoggedIntoTroupe');
      now.onUserLoggedOutOfTroupe = createTrigger('userLoggedOutOfTroupe');

      now.ready(function() {
        connected = true;
        now.subscribeToTroupe(window.troupeContext.troupe.id);
        if(subscribeOnConnect) {
          module.subscribeTroupeChatMessages();
        }
      });

    },

    send: function(message) {
      now.newChatMessageToTroupe({
        troupeId: window.troupeContext.troupe.id,
        text: message
      });
    },

    subscribeTroupeChatMessages: function() {
      if(connected) {
        now.subscribeToTroupeChat(window.troupeContext.troupe.id);
      } else {
        subscribeOnConnect = true;
      }
    },

    unsubscribeTroupeChatMessages: function() {
     if (connected) {
        now.unsubscribeToTroupeChat(window.troupeContext.troupe.id);
      }
      subscribeOnConnect = false;
    }
  };

  return module;
});
