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

      now.onTroupeChatMessage = function(message) {
        $(document).trigger('chat', message);
      };
      
      now.ready(function() {
        connected = true;
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
