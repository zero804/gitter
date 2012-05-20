define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var ChatView = Backbone.View.extend({
    el: '#chat',

    render: function() {
      this.loadNextMessages();
      return this;
    },

    close: function() {
      console.log("close chatview");
      this.off();
    },

    loadNextMessages: function() {
      console.log("Loading!@");
      console.log("/troupes/" + window.troupeContext.troupe.id + "/chatMessages");

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
            var compiledTemplate = $('<div>' + data[i] + '</div>');//self.renderMessage(data[i]);
            items.push(compiledTemplate);
          }

          var chatFrame = $(".frame-chat", this.el);
          chatFrame.append(items.join(''));

          //self.attachTooltipHandlers(chatFrame);

          //self.chatMessageSkip += PAGE_SIZE;
        }
      });
    }

  });

  return ChatView;

});
