// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/chat/chat.mustache',
  'text!templates/chat/chat-row.mustache',
  'text!templates/chat/chat-row-current.mustache',
  'text!templates/chat/user-avatar.mustache',
  'components/chat/chat-component',
  'jquery_timeago'
], function($, _, Backbone, Mustache, template, rowTemplate, rowCurrentTemplate, userAvatarTemplate, chat, _timeago) {
  var PAGE_SIZE = 50;

  var ChatView = Backbone.View.extend({
    chatMessageSkip: 0,
    chatMessageLimit: PAGE_SIZE,

    initialize: function() {
      this.scrollEventBound = _.bind(this.chatWindowScroll, this);
      _.bindAll(this, "userLoggedIntoTroupe", "userLoggedOutOfTroupe");

      $(window).bind('scroll', this, this.scrollEventBound);

      $(document).bind('chat', this, this.onMessage);
      chat.subscribeTroupeChatMessages();

      $(document).bind('userLoggedIntoTroupe', this.userLoggedIntoTroupe);
      $(document).bind('userLoggedOutOfTroupe', this.userLoggedOutOfTroupe);

      this.refreshUsers();
    },

    events: {
      "keydown .chatbox":          "detectReturn"
    },

    beforeClose: function() {
      chat.unsubscribeTroupeChatMessages();

      $(window).unbind('scroll', this.scrollEventBound);

      $(document).unbind('chat', this.onMessage);
      $(document).unbind('userLoggedIntoTroupe', this.userLoggedIntoTroupe);
      $(document).unbind('userLoggedOutOfTroupe', this.userLoggedOutOfTroupe);

    },

    userLoggedIntoTroupe: function(event, data) {
      console.dir(data);
      var img = $('.panel-online-status .avatar-' + data.userId + " img");
      img.removeClass('offline', 500);
    },


    userLoggedOutOfTroupe: function(event, data) {
      var img = $('.panel-online-status .avatar-' + data.userId + " img");
      img.addClass('offline', 500);
    },

    chatWindowScroll: function() {
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
        this.loadNextMessages();
      }
    },

    refreshUsers: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderUsers(data);
        }
      });

    },

    renderUsers: function(data) {
      var panel = $('.panel-online-status');
      panel.empty();
      // Sort by online=true, name
      data.sort(function(a, b) { return - ((a.online ? 1 : 0) - (b.online ? 1 : 0)) });

      for(var i = 0; i < data.length; i++) {
        var d = data[i];
        /* Skip current user */
        if(d.id == window.troupeContext.user.id) continue;
        var avatar = Mustache.render(userAvatarTemplate,  {
          id: d.id,
          displayName: d.displayName,
          additionalClasses: d.online ? "" : "offline"
        } );
        panel.append(avatar);
      }
      $('.dp-tooltip', panel).tooltip();
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
