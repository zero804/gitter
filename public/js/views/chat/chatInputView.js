/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'log!chat-input',
  'jquery',
  'utils/context',
  'views/base',
  'utils/appevents',
  'hbs!./tmpl/chatInputView',
  'hbs!./tmpl/typeaheadListItem',
  'hbs!./tmpl/emojiTypeaheadListItem',
  'utils/momentWrapper',
  'utils/safe-html',
  'utils/scrollbar-detect',
  'collections/instances/integrated-items',
  './emoji_list',
  'jquery-textcomplete', // No ref
  'jquery-sisyphus' // No ref
], function(log, $, context, TroupeViews, appEvents, template, listItemTemplate, emojiListItemTemplate, moment, safeHtml, hasScrollBars, itemCollections, emojiList) {
  "use strict";

  /** @const */
  var MAX_CHAT_HEIGHT = 145;

  /** @const */
  var EXTRA_PADDING = 20;

  var ChatInputView = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      this.rollers = options.rollers;
    },

    getRenderData: function() {
      return {
        user: context.user()
      };
    },

    afterRender: function() {
      var inputBox = new ChatInputBoxView({
        el: this.$el.find('.trpChatInputBoxTextArea'),
        rollers: this.rollers
      });
      this.inputBox = inputBox;
      this.$el.find('form').sisyphus({
        locationBased: true,
        timeout: 2,
        customKeySuffix: 'chat-' + context.getTroupeId(),
        name: 'chat-' + context.getTroupeId(),
        onRestore: function() {
          inputBox.trigger('change');
        }
      }).restoreAllData();

      this.$el.find('textarea').textcomplete([
          {
            match: /(^|\s)#(\w*)$/,
            maxCount: 8,
            search: function(term, callback) {
              $.getJSON('/api/v1/troupes/'+context.getTroupeId()+'/issues', { q: term })
                .done(function(resp) {
                  callback(resp);
                })
                .fail(function() {
                  callback([]);
                });
            },
            template: function(issue) {
              return listItemTemplate({
                name: issue.number,
                description: issue.title
              });
            },
            replace: function(issue) {
                return '$1#' + issue.number + ' ';
            }
          },
          {
            match: /(^|\s)@(\w*)$/,
            maxCount: 8,
            search: function(term, callback) {
                var loggedInUsername = context.user().get('username');
                var matches = itemCollections.users.models.filter(function(user) {
                  var username = user.get('username');
                  var displayName = (user.get('displayName') || '').toLowerCase();
                  return username != loggedInUsername && (username.indexOf(term) === 0 || displayName.indexOf(term) === 0);
                });
                callback(matches);
            },
            template: function(user) {
              return listItemTemplate({
                name: user.get('username'),
                description: user.get('displayName')
              });
            },
            replace: function(user) {
                return '$1@' + user.get('username') + ' ';
            }
          },
          {
            match: /(^|\s):(\w*)$/,
            maxCount: 8,
            search: function(term, callback) {
              if(term.length < 1) return callback([]);

              var matches = emojiList.filter(function(emoji) {
                return emoji.indexOf(term) === 0;
              });
              callback(matches);
            },
            template: function(emoji) {
              return emojiListItemTemplate({
                emoji: emoji
              });
            },
            replace: function (value) {
              return '$1:' + value + ': ';
            }
          }
      ]);

      // http://stackoverflow.com/questions/16149083/keyboardshrinksview-makes-lose-focus/18904886#18904886
      this.$el.find("textarea").on('touchend', function(){
        var t = $(this);

        window.setTimeout(function() {
          t.focus();
        }, 300);

        return true;
      });

      this.listenTo(this.inputBox, 'save', this.send);
    },

    send: function(val) {
      if(val) {
        var model = this.collection.create({
          text: val,
          fromUser: context.getUser(),
          sent: moment()
        });
        appEvents.trigger('chat.send', model);
      }
      return false;
    }
  });

  var ChatCollectionResizer = function(options) {
    var compact = options.compactView;
    var rollers = options.rollers;
    var editMode = options.editMode;

    var el = options.el;
    var $el = $(el);

    var frameChat = $(compact ? '#content': '#content-wrapper').first();

    this.resetInput = function(initial) {
      $el.css({ height: '', 'overflow-y': '' });

      var css = {};
      // css[compact ? 'padding-bottom' : 'margin-bottom'] = '';
      css[compact ? 'padding-bottom' : 'bottom'] = '';
      frameChat.css(css);
      log('Applying ', css, ' to ', frameChat);

      adjustScroll(initial);
    };

    this.resizeInput = function() {
      var scrollHeight = el.scrollHeight;
      var height = scrollHeight > MAX_CHAT_HEIGHT ? MAX_CHAT_HEIGHT : scrollHeight;
      var offsetHeight = el.offsetHeight;
      if(offsetHeight == height) {
        return;
      }

      var overflow = height < scrollHeight ? 'scroll' : '';
      $el.css({ height: height, 'overflow-y': overflow });

      if (!editMode) {
        var css = {};

        if(compact) {
          css['padding-bottom'] = (height + EXTRA_PADDING) + 'px';
        } else {
          // css['margin-bottom'] = height + 'px';
          css['bottom'] = (height + 30) + 'px';
        }

        log('Applying ', css, ' to ', frameChat);
        frameChat.css(css);
      }

      adjustScroll();
    };

    function adjustScroll(initial) {
      if(!rollers) return;
      if(initial) {
        rollers.adjustScroll(300);
      } else {
        rollers.adjustScrollContinuously(300);
      }
    }


  };

  var ChatInputBoxView = TroupeViews.Base.extend({
    events: {
      "keydown":  "onKeyDown",
      "keyup":    "onKeyUp",
      "focusout": "onFocusOut"
    },

    // pass in the textarea as el for ChatInputBoxView
    // pass in a scroll delegate
    initialize: function(options) {
      if(hasScrollBars()) {
        this.$el.addClass("scroller");
      }

      var chatResizer = new ChatCollectionResizer({
        compactView: this.compactView,
        el: this.el,
        editMode: this.options.editMode,
        rollers: options.rollers
      });

      this.chatResizer = chatResizer;

      this.listenTo(this, 'change', function() {
        chatResizer.resizeInput();
      });

      chatResizer.resetInput(true);
    },

    onFocusOut: function() {
      if (this.compactView) this.send();
    },

    onKeyUp: function() {
      this.chatResizer.resizeInput();
    },

    setTopic: function(topic) {
      $.ajax({
        url: '/api/v1/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ topic: topic })
      });
    },

    leaveRoom: function() {
      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/users/" + context.getUserId(),
        data: "",
        type: "DELETE",
      });
    },


    handleCommands: function() {
      if (this.$el.val().match(/^\/query @\w+/)) {
        var user = this.$el.val().match(/\/query @(\w+)/)[1];
        // this doesn't entire fix the issue of the chat not clearing properly
        $('#chatInputForm').trigger('reset');
        this.$el.val('');
        window.location = '/' + user;
        return;
      }

      if (this.$el.val().match(/^\/topic \w+/)) {
        var topic = this.$el.val().match(/\/topic (.+)/)[1];
        this.setTopic(topic);
        this.$el.val('');
        //window.location.reload();
        return;
      }

      if (this.$el.val().match(/^\/leave/)) {
        this.$el.val('');
        this.leaveRoom();
        return;
      }

    },


    onKeyDown: function(e) {
      if(e.keyCode == 13 && (!e.ctrlKey && !e.shiftKey) && (!this.$el.val().match(/^\s+$/)) && !this.$el.parent().find('.dropdown-menu').is(":visible")) {
        e.stopPropagation();
        e.preventDefault();

        this.handleCommands();

        this.send();
        return;
      }
    },

    send: function() {
      this.trigger('save', safeHtml(this.$el.val()));
      $('#chatInputForm').trigger('reset');
      this.$el.val('');
      this.chatResizer.resetInput();
    }
  });

  return { ChatInputView: ChatInputView, ChatInputBoxView: ChatInputBoxView };
});
