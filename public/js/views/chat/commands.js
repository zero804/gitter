define([
  'underscore',
  'jquery',
  'utils/context',
  'utils/appevents'
], function(_, $, context, appEvents) {
  "use strict";

  var commandsList = [
    {
      command: 'ban @username',
      description: 'Ban somebody from the room',
      criteria: function() {
        var isOrgRoom = false;
        if (context.troupe().get("githubType") == "ORG") isOrgRoom = true;
        return !context.inOneToOneTroupeContext() && context().permissions.admin && !isOrgRoom;
      },
      completion: 'ban @',
      regexp: /^\/ban/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/ban @([\w\-]+)/);
        if (!userMatch) return;
        var user = userMatch[1];
        $.ajax({
          url: '/api/v1/rooms/' + context.getTroupeId() + '/bans',
          contentType: "application/json",
          dataType: "json",
          type: "POST",
          data: JSON.stringify({ username: user }),
          success: function() {
            view.reset();
          },
          statusCode: {
            403: function() {
              var errorMessage = 'You do not have permission to ban people.';
              appEvents.triggerParent('user_notification', {
                title: 'Could not ban user',
                text: errorMessage,
                className: 'notification-error'
              });
            },
            400: function(data) {
              var errorMessage = data.responseJSON.error;
              appEvents.triggerParent('user_notification', {
                title: 'Could not ban user',
                text: errorMessage,
                className: 'notification-error'
              });
            },
            404: function() {
              var errorMessage = 'That person does not exist (on Gitter that is)';
              appEvents.triggerParent('user_notification', {
                title: 'Could not ban user',
                text: errorMessage,
                className: 'notification-error'
              });
            }
          }
        });
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
      command: 'me',
      description: 'Let people know what\'s happening',
      completion: 'me ',
      regexp: /^\/me/
    },
    {
      command: 'query @username',
      description: 'Have a private conversation with @username',
      completion: 'query @',
      regexp: /^\/query/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/query @([\w\-]+)/);
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
      command: 'remove @username',
      description: 'Remove somebody from the room',
      criteria: function() {
        return !context.inOneToOneTroupeContext() && context().permissions.admin;
      },
      completion: 'remove @',
      regexp: /^\/remove/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/remove @([\w\-]+)/);
        if (!userMatch) return;
        var user = userMatch[1];
        appEvents.trigger('command.room.remove', user);
        view.reset();
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
      command: 'collapse',
      description: 'Collapse chat messages with embedded media',
      completion: 'collapse ',
      regexp: /^\/collapse/,
      action: function(view) {
        appEvents.trigger('command.collapse.chat');
        view.reset();
      }
    },
    {
      command: 'expand',
      description: 'Expand chat messages with embedded media',
      completion: 'expand ',
      regexp: /^\/expand/,
      action: function(view) {
        appEvents.trigger('command.expand.chat');
        view.reset();
      }
    },
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
      command: 'unban @username',
      description: 'Unban somebody from the room',
      criteria: function() {
        var isOrgRoom = false;
        if (context.troupe().get("githubType") == "ORG") isOrgRoom = true;
        return !context.inOneToOneTroupeContext() && context().permissions.admin && !isOrgRoom;
      },
      completion: 'unban @',
      regexp: /^\/unban/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/unban @([\w\-]+)/);
        if (!userMatch) return;
        var user = userMatch[1];
        $.ajax({
          url: '/api/v1/rooms/' + context.getTroupeId() + '/bans/' + user,
          contentType: "application/json",
          dataType: "json",
          type: "DELETE",
          success: function() {
            view.reset();
          },
          statusCode: {
            403: function() {
              var errorMessage = 'You do not have permission to unban people.';
              appEvents.triggerParent('user_notification', {
                title: 'Could not ban user',
                text: errorMessage,
                className: 'notification-error'
              });
            },
            404: function() {
              var errorMessage = 'That person is not on the banned list.';
              appEvents.triggerParent('user_notification', {
                title: 'Could not ban user',
                text: errorMessage,
                className: 'notification-error'
              });
            }
          },
        });
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
