define([
  'jquery',
  'underscore',
  'now'
], function($, _, Backbone, nowStub){
  
  "use strict";
  
  return {
    connect: function() {
      now.receiveMessage = function(name, message){
        $(document).trigger('chat', {to: name, from: name, text: message });
      };
    },
    
    send: function(message) {
      now.distributeMessage(message);
    }
  };
  
});
