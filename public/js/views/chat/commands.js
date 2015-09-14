"use strict";
var _ = require('underscore');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var apiClient = require('components/apiClient');

module.exports = (function() {


  var commandsList = [
    {
      command: 'ban @username',
      description: 'Ban somebody from the room.',
      criteria: function() {
        var isOrgRoom = false;
        if (context.troupe().get("githubType") == "ORG") isOrgRoom = true;
        return !context.inOneToOneTroupeContext() && context.isTroupeAdmin() && !isOrgRoom;
      },
      completion: 'ban @',
      regexp: /^\/ban/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/ban @([\w\-]+)(\s+(removemsgs))?/);
        if (!userMatch) return;
        var user = userMatch[1];
        var removeMessages = !!userMatch[3];

        apiClient.room.post('/bans', { username: user, removeMessages: removeMessages })
          .then(function() {
            view.reset();
          })
          .fail(function(xhr) {
            var errorMessage;
            switch(xhr.status) {
              case 403:
                errorMessage = 'You do not have permission to ban people.';
                break;

              case 400:
                errorMessage = xhr.responseJSON.error;
                break;

              case 404:
                errorMessage = 'That person does not exist (on Gitter that is)';
                break;
              default:
                errorMessage = 'Ban failed';
            }

            appEvents.triggerParent('user_notification', {
              title: 'Could not ban user',
              text: errorMessage,
              className: 'notification-error'
            });
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
      regexp: /^\/fav\s*$/,
      action: function(view) {
        var isFavourite = !context.troupe().get('favourite');

        apiClient.userRoom.put('', { favourite: isFavourite })
          .then(function() {
            view.reset();
          });

        view.reset();
      }
    },
    {
      command: 'leave',
      description: 'Leave the room',
      completion: 'leave ',
      regexp: /^\/(leave|part)\s*$/,
      criteria: function() {
        return !context.inOneToOneTroupeContext();
      },
      action: function(view) {
        view.reset();

        apiClient.room.delete('/users/' + context.getUserId(), { })
          .then(function() {
            appEvents.trigger('navigation', '/home', 'home', ''); // TODO: figure out a title
          });

      }
    },
    {
      command: 'lurk',
      description: 'Lurk in the room',
      completion: 'lurk ',
      regexp: /^\/lurk\s*$/,
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

        apiClient.userRoom.put('/settings/notifications', { push: "mention" })
          .then(done);

        apiClient.userRoom.put('', { lurk: true })
          .then(done);
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
        return !context.inOneToOneTroupeContext() && context.isTroupeAdmin();
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
      regexp: /^\/collapse\s*$/,
      action: function(view) {
        appEvents.trigger('command.collapse.chat');
        view.reset();
      }
    },
    {
      command: 'expand',
      description: 'Expand chat messages with embedded media',
      completion: 'expand ',
      regexp: /^\/expand\s*$/,
      action: function(view) {
        appEvents.trigger('command.expand.chat');
        view.reset();
      }
    },
    {
      command: 'topic foo',
      description: 'Set room topic to foo',
      criteria: function() {
        return !context.inOneToOneTroupeContext() && context.isTroupeAdmin();
      },
      completion: 'topic ',
      regexp: /^\/topic/,
      action: function(view) {
        var topicMatch = view.$el.val().match(/^\/topic (.+)/);
        if (topicMatch) {
          var topic = topicMatch[1];
          view.reset();

          context.troupe().set('topic', topic);

          apiClient.room.put('', { topic: topic });
        }
      }
    },
    {
      command: 'unban @username',
      description: 'Unban somebody from the room',
      criteria: function() {
        var isOrgRoom = false;
        if (context.troupe().get("githubType") == "ORG") isOrgRoom = true;
        return !context.inOneToOneTroupeContext() && context.isTroupeAdmin() && !isOrgRoom;
      },
      completion: 'unban @',
      regexp: /^\/unban/,
      action: function(view) {
        var userMatch = view.$el.val().match(/\/unban @([\w\-]+)/);
        if (!userMatch) return;
        var user = userMatch[1];

        apiClient.room.delete('/bans/' + user, { })
          .then(function() {
            view.reset();
          })
          .fail(function(xhr) {
            var errorMessage;
            switch(xhr.status) {
              case 403:
                errorMessage = 'You do not have permission to unban people.';
                break;

              case 400:
                errorMessage = xhr.responseJSON.error;
                break;

              case 404:
                errorMessage = 'That person is not on the banned list.';
                break;
              default:
                errorMessage = 'Unban failed';
            }

            appEvents.triggerParent('user_notification', {
              title: 'Could not unban user',
              text: errorMessage,
              className: 'notification-error'
            });
          });

      }
    }
  ];

  return {

    size: commandsList.length,

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


})();
