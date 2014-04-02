/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'jquery',
  'utils/context',
  'utils/appevents'
], function(_, $, context, appEvents) {
  "use strict";

  var commandsList = [
    {
      command: 'topic foo',
      description: 'Set room topic to foo',
      criteria: function() {
        return !context.inOneToOneTroupeContext() && context().permissions.admin;
      },
      completion: 'topic ',
      regexp: /^\/topic/,
      action: function(view) {
        var topicMatch = view.$el.val().match(/^\/topic (.+)/);
        if (topicMatch) {
          var topic = topicMatch[1];
          view.reset();

          context.troupe().set('topic', topic);
          $.ajax({
            url: '/api/v1/rooms/' + context.getTroupeId(),
            contentType: "application/json",
            dataType: "json",
            type: "PUT",
            data: JSON.stringify({ topic: topic })
          });
        }
      }
    },
    {
      command: 'fav',
      description: 'Toggle the room as a favourite',
      completion: 'fav ',
      regexp: /^\/fav/,
      action: function(view) {
        var isFavourite = !context.troupe().get('favourite');

        $.ajax({
          url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId(),
          contentType: "application/json",
          dataType: "json",
          type: "PUT",
          data: JSON.stringify({ favourite: isFavourite })
        });

        view.reset();
      }
    },
    {
      command: 'query @user',
      description: 'Go private with @user',
      completion: 'query @',
      regexp: /^\/query/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/query @(\w+)/);
        if (!userMatch) return;
        var user = userMatch[1];
        view.reset();

        var url = '/' + user;
        var type = user === context.user().get('username') ? 'home' : 'chat';
        var title = user;

        appEvents.trigger('navigation', url, type, title);
      }
    },
    {
      command: 'leave',
      description: 'Leave the room',
      completion: 'leave ',
      regexp: /^\/leave/,
      criteria: function() {
        return !context.inOneToOneTroupeContext();
      },
      action: function(view) {
        view.reset();

        $.ajax({
          url: "/api/v1/rooms/" + context.getTroupeId() + "/users/" + context.getUserId(),
          data: "",
          type: "DELETE",
        });
      }
    },
    {
      command: 'lurk',
      description: 'Lurk in the room',
      completion: 'lurk',
      regexp: /^\/lurk/,
      criteria: function() {
        return !context.inOneToOneTroupeContext();
      },
      action: function(view) {
        view.reset();

        var c = 0;
        function done() {
          if(++c == 2) {
            appEvents.triggerParent('user_notification', {
              title: "Lurking",
              text: "Lurk mode has been enabled for this room"
            });
          }
        }

        $.ajax({
          url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId() + '/settings/notifications',
          contentType: "application/json",
          dataType: "json",
          type: "PUT",
          data: JSON.stringify({ push: "mention" }),
          success: done
        });


        $.ajax({
          url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId(),
          contentType: "application/json",
          dataType: "json",
          type: "PUT",
          data: JSON.stringify({ lurk: true }),
          success: done
        });

      }
    },

    {
      command: 'subst',
      regexp: /^s\/([^\/]+)\/([^\/]*)\/i?(g?)\s*$/,
      action: function(view) {
        var re = this.regexp.exec(view.$el.val());
        var search = re[1];
        var replace = re[2];
        var global = !!re[3];
        view.trigger('subst', search, replace, global);

        view.reset();
      }
    },
    {
      command: 'channel',
      description: 'Create/join a channel',
      completion: 'channel ',
      regexp: /^\/channel/,
      action: function(view) {
        var input = view.$el.val();
        var channelMatch = input.match(/^\s*\/channel(?:\s+(\w+))?/);
        var channel = channelMatch[1];

        view.$el.val('');
        if(channel) {
          appEvents.trigger('route', 'createcustomroom/' + channel);
        } else {
          appEvents.trigger('route', 'createcustomroom');
        }
      }
    }

  ];

  return {

    getSuggestions: function(term) {
      return commandsList.filter(function(cmd) {
        var elligible = (!cmd.criteria || cmd.criteria()) && cmd.completion;
        return elligible && cmd.command.indexOf(term) === 0;
      });
    },

    findMatch: function(text) {
      return _.find(commandsList, function(cmd) {
        return text.match(cmd.regexp);
      });
    }

  };

});
