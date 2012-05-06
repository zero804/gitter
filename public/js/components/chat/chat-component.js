define([
  'jquery',
  'underscore',
  'now',
  'noty'
], function($, _, Backbone, nowStub, notyStub){

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
        now.subscribeToTroupe(window.troupeContext.troupe.id, function(err) {
          if(err) { 
            noty({
              text:"There is a communication problem with the Troupe server. Please try reload the page.",
              layout: "top",
              type:"error",
              animateOpen:{"height":"toggle"},
              animateClose:{"height":"toggle"},
              speed:500,
              timeout:5000,
              closeButton:false,
              closeOnSelfClick:true,
              closeOnSelfOver:false,
              modal:false
            });
          }
        });
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
