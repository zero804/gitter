define([
  'jquery',
  'underscore',
  'now',
  'noty',
  'collections/chat'
], function($, _, nowInitialize, chatModels){
  /*global console: false */
  "use strict";

  var connected = false;

  var now = nowInitialize(window.troupeContext.websockets.nowjs, window.troupeContext.websockets.options);

  var module = {
    connect: function() {
      function createTrigger(name) {
        return function(message) {
          //console.log("Trigger for " + name + " on message", message);
          $(document).trigger(name, message);
        };
      }

      now.onTroupeChatMessage = createTrigger('chat');
      now.onUserLoggedIntoTroupe = createTrigger('userLoggedIntoTroupe');
      now.onUserLoggedOutOfTroupe = createTrigger('userLoggedOutOfTroupe');
      now.onTroupeUnreadCountsChange = createTrigger('troupeUnreadCountsChange');
      now.onNewUnreadItems = createTrigger('newUnreadItems');
      now.onUnreadItemsRemoved = createTrigger('unreadItemsRemoved');

      now.onFileEvent = createTrigger('file');
      now.onNotification = createTrigger('notification');
      now.onMailEvent = createTrigger('mail');
      now.onDataChange = function(message) {
          $(document).trigger('datachange:' + message.modelName, message);
          $(document).trigger('datachange:*', message);
      };

      now.ready(function() {
        connected = true;
        now.subscribeToTroupe(window.troupeContext.troupe.id, function(err) {
          if(err) {
            $.noty({
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
      });
    }
  };

  return module;
});
