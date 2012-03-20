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
      now.receiveMessage = function(name, message){
        $(document).trigger('chat', {to: name, from: name, text: message });
      };
      
      now.onTroupeChatMessage = function(message) {
        $(document).trigger('chat', { text: message.text });
      };
      
      now.ready(function(){
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
      console.log("unsubscribeTroupeChatMessages");
      if(connected) {
        now.unsubscribeToTroupeChat(window.troupeContext.troupe.id);
      }
      subscribeOnConnect = false;
    }
  };
  
  
  return module;
});
