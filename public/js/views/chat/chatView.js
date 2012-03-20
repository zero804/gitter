// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/chat/chat.mustache',
  'text!templates/chat/chat-row.mustache',
  'components/chat/chat-component'
], function($, _, Backbone, Mustache, template, rowTemplate, chat){
  
  var ChatView = Backbone.View.extend({    
    initialize: function() {
      $(document).bind('chat', this.onMessage);
    },
    
    events: {
      "keydown .chatbox":          "detectReturn"
    },
    
    beforeClose: function() {
      $(document).unbind('chat', this.onMessage);
    },
    
    onMessage: function(event, msg) {
      var compiledTemplate = Mustache.render(rowTemplate, msg);
      $(".frame-chat", this.el).prepend(compiledTemplate);
    },
    
    detectReturn: function(e) {
      if(e.keyCode == 13) {
        this.send();
        // changed it to just enter, tried for ages to reset the textarea after send, with not much luck!
      }
    },
    
    send: function() {
      chat.send($(".chatbox").val());
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      
      $('.dp-tooltip', this.el).tooltip();
      $('.chat-bubble', this.el).tooltip();
      
      return this;
    }
    
  });

  return ChatView;
});
