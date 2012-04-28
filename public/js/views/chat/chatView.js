// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/chat/chat.mustache',
  'text!templates/chat/chat-row.mustache',
  'text!templates/chat/chat-row-current.mustache',
  'components/chat/chat-component',
  'jquery_timeago'
], function($, _, Backbone, Mustache, template, rowTemplate, rowCurrentTemplate, chat, _timeago) {
  var PAGE_SIZE = 50;
  
  var ChatView = Backbone.View.extend({
    chatMessageSkip: 0,
    chatMessageLimit: PAGE_SIZE,
    
    initialize: function() {
      this.scrollEventBound = _.bind(this.chatWindowScroll, this);
      $(document).bind('chat', this, this.onMessage);
      $(window).bind('scroll', this, this.scrollEventBound);
      
      chat.subscribeTroupeChatMessages();
    },
    
    events: {
      "keydown .chatbox":          "detectReturn"
    },
    
    beforeClose: function() {
      chat.unsubscribeTroupeChatMessages();
      $(document).unbind('chat', this.onMessage);
      $(window).unbind('scroll', this.scrollEventBound);
    },
    
    chatWindowScroll: function() {
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
        this.loadNextMessages();
      }
    },
    
    onMessage: function(event, msg) {
      var self = event.data;
      

      var compiledTemplate = self.renderMessage(msg);

      var item = $(compiledTemplate);
      item.hide();
      self.attachTooltipHandlers(item);

      $(".frame-chat", this.el).prepend(item);
      item.show('slide', {}, 'fast');

    },
    
    attachTooltipHandlers: function(item) {
      $('.chat-bubble', item).each(this.attachTooltipHandlerToItem);
      $('.dp-tooltip', item).tooltip();
    },

    attachTooltipHandlerToItem: function(index, el) {
      var jel = $(el);
      if(jel.data("timeago-attached")) return;
      if(!jel.data("sent")) return;
      jel.data("timeago-attached", true);

      jel.tooltip({title: function() { return $.timeago(new Date($(this).data("sent"))); }});
    },

    renderMessage: function(msg) {
      if(msg.fromUser.id == window.troupeContext.user.id) {
        return Mustache.render(rowCurrentTemplate,  this.prepareForTemplate(msg));
      }

      return Mustache.render(rowTemplate,  this.prepareForTemplate(msg));
    },

    prepareForTemplate: function(msg) {
       return {
          text: msg.text,
          sent: msg.sent,
          fromUserDisplayName: msg.fromUser.displayName,
          fromUserAvatarUrlSmall: "/avatar/" + msg.fromUser.id
        };
    },
    
    detectReturn: function(e) {
      if(e.keyCode == 13) {
        return this.send();
      }
    },
    
    send: function() {
      var chatBox = $(".chatbox");
      chat.send(chatBox.val());
      chatBox.val('');
      return false;
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);

      this.attachTooltipHandlers(this.el);

      
      this.loadNextMessages();
      
      return this;
    },
    
    loadNextMessages: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/chatMessages",
        contentType: "application/json",
        data: { skip: this.chatMessageSkip, limit: this.chatMessageLimit },
        dataType: "json",
        type: "GET",
        success: function(data) {
          if(!data.length) {
            $(window).unbind('scroll', self.scrollEventBound);
            return;
          }

          // TODO: speed this up
          var items = [];
          for(var i = 0; i < data.length; i++) {
            var compiledTemplate = self.renderMessage(data[i]);
            items.push(compiledTemplate);
          }

          var chatFrame = $(".frame-chat", this.el);
          chatFrame.append(items.join(''));

          self.attachTooltipHandlers(chatFrame);




          self.chatMessageSkip += PAGE_SIZE;
        }
      });
    }
    
  });

  return ChatView;
});
