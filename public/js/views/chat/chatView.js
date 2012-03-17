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
  var PAGE_SIZE = 50;
  
  var ChatView = Backbone.View.extend({   
    chatMessageSkip: 0,
    chatMessageLimit: PAGE_SIZE,
    
    initialize: function() {
      this.scrollEventBound = _.bind(this.chatWindowScroll, this);
      $(document).bind('chat', this.onMessage);
      $(window).bind('scroll', this.scrollEventBound);
      
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
      console.dir(arguments);
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
        console.log("LOADING MORE");
        this.loadNextMessages();
        /*
        $('div#loadmoreajaxloader').show();
        $.ajax({
          url: "loadmore.php",
          success: function(html) {
            if(html)
            {
              $("#postswrapper").append(html);
              $('div#loadmoreajaxloader').hide();
            }else
            {
              $('div#loadmoreajaxloader').html('<center>No more posts to show.</center>');
            }
          }
        });
        */
      }
    }, 
    
    onMessage: function(event, msg) {
      var compiledTemplate = Mustache.render(rowTemplate, msg);
      var item = $(compiledTemplate);
      item.hide();
      $(".frame-chat", this.el).prepend(item);
      item.show('slide', {}, 'fast');
    },
    
    detectReturn: function(e) {
      if(e.keyCode == 13 && e.ctrlKey) {
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
      
      $('.dp-tooltip', this.el).tooltip();
      $('.chat-bubble', this.el).tooltip();
      
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
          for(var i = data.length - 1; i >= 0; i--) {
            var compiledTemplate = Mustache.render(rowTemplate, data[i]);
            items.push(compiledTemplate);
          }
          var chatFrame = $(".frame-chat", this.el);
          chatFrame.append(items.join(''));
          self.chatMessageSkip += PAGE_SIZE;
        }
      });
    }
    
  });

  return ChatView;
});
