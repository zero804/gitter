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
  'utils/scrollbar-detect',
  'utils/is-mobile',
  'utils/emoji',
  'components/drafty',
  'utils/cdn',
  './commands',
  'cocktail',
  'views/keyboard-events-mixin',
  'utils/platform-keys',
  'bootstrap_tooltip', // No ref
  'jquery-textcomplete', // No ref
  'utils/sisyphus-cleaner' // No ref
], function(log, $, context, TroupeViews, appEvents, template, listItemTemplate,
  emojiListItemTemplate, moment, hasScrollBars, isMobile, emoji, drafty, cdn, commands,
  cocktail, KeyboardEventsMixin, platformKeys) {
  "use strict";

  /** @const */
  var MAX_CHAT_HEIGHT = $(document).height() - $("#header-wrapper").height() - 140;

  /** @const */
  var MAX_TYPEAHEAD_SUGGESTIONS = isMobile() ? 3 : 8;

  /** @const */
  var EXTRA_PADDING = 20;

  /* This value is also in chatItemView! */
  /** @const */
  var EDIT_WINDOW = 240000;

  /** @const */
  var SUGGESTED_EMOJI = ['smile', 'worried', '+1', '-1', 'fire', 'sparkles', 'clap', 'shipit'];

  /** @const */
  var MOBILE_PLACEHOLDER = 'Touch here to type a chat message.';

  /** @const */
  var PLACEHOLDER = 'Click here to type a chat message. Supports GitHub flavoured markdown.';

  /** @const */
  var PLACEHOLDER_COMPOSE_MODE = PLACEHOLDER+' '+ platformKeys.cmd +'+Enter to send.';

  var ComposeMode = function() {
    var stringBoolean = window.localStorage.getItem('compose_mode_enabled') || 'false';
    this.disabled = JSON.parse(stringBoolean);
  };

  ComposeMode.prototype.toggle = function() {
    this.disabled = !this.disabled;
    var stringBoolean = JSON.stringify(this.disabled);
    window.localStorage.setItem('compose_mode_enabled', stringBoolean);
  };

  ComposeMode.prototype.isEnabled = function() {
    return this.disabled;
  };

  var ChatInputView = TroupeViews.Base.extend({
    template: template,

    events: {
      'click .compose-mode-toggle': 'toggleComposeMode'
    },

    keyboardEvents: {
      'chat.toggle': 'toggleComposeMode'
    },

    initialize: function(options) {
      this.rollers = options.rollers;
      this.chatCollectionView = options.chatCollectionView;
      this.composeMode = new ComposeMode();
      this.userCollection = options.userCollection;
      this.listenTo(appEvents, 'input.append', function(text, options) {
        if(this.inputBox) {
          this.inputBox.append(text, options);
        }
      });
      this.listenTo(appEvents, 'focus.request.chat', function() {
        if(this.inputBox) {
          this.inputBox.$el.focus();
          appEvents.trigger('focus.change.chat');
        }
      });
    },

    getComposeModeTitle: function() {
      var mode = this.composeMode.isEnabled() ? 'chat' : 'compose';
      return 'Switch to '+ mode +' mode ('+ platformKeys.cmd +' + /)';
    },

    getRenderData: function() {
      var isComposeModeEnabled = this.composeMode.isEnabled();
      var placeholder;

      if(this.compactView) {
        placeholder = MOBILE_PLACEHOLDER;
      } else if(isComposeModeEnabled) {
        placeholder = PLACEHOLDER_COMPOSE_MODE;
      } else {
        placeholder = PLACEHOLDER;
      }

      return {
        user: context.user(),
        isComposeModeEnabled: this.composeMode.isEnabled(),
        placeholder: placeholder,
        composeModeToggleTitle: this.getComposeModeTitle(),
        showMarkdownTitle: 'Markdown help ('+ platformKeys.cmd +' + '+ platformKeys.gitter +' + m)',
        value: $("#chat-input-textarea").val()
      };
    },

    afterRender: function(data) {
      if (!window._troupeIsTablet) $("#chat-input-textarea").focus();

      var inputBox = new ChatInputBoxView({
        el: this.$el.find('.js-chat-input-text-area'),
        rollers: this.rollers,
        chatCollectionView: this.chatCollectionView,
        composeMode: this.composeMode,
        value: data.value
      });
      this.inputBox = inputBox;

      this.$el.find('.compose-mode-toggle, .md-help').tooltip({placement: 'left'});
      var userCollection = this.userCollection;

      var $textarea = this.$el.find('textarea');

      $textarea.textcomplete([
        {
          match: /(^|\s)(([\w-_]+\/[\w-_]+)?#(\d*))$/,
          maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
          search: function(term, callback) {
            var terms = term.split('#');
            var repoName = terms[0];
            var issueNumber = terms[1];
            var query = {};

            if(repoName) query.repoName = repoName;
            if(issueNumber) query.issueNumber = issueNumber;

            $.getJSON('/api/v1/rooms/' + context.getTroupeId() + '/issues', query)
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
            return '$1$3#' + issue.number + ' ';
          }
        },
        {
          match: /(^|\s)@([a-zA-Z0-9_\-]*)$/,
          maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
          search: function(term, callback) {
            var lowerTerm = term.toLowerCase();
            var loggedInUsername = context.user().get('username').toLowerCase();

            var matches = userCollection && userCollection.filter(function(user) {
              var username = user.get('username').toLowerCase();

              if(username === loggedInUsername) return false;

              var displayName = (user.get('displayName') || '').toLowerCase();

              return (username.indexOf(lowerTerm) === 0 || displayName.indexOf(lowerTerm) === 0);
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
          match: /(^|\s):([\-+\w]*)$/,
          maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
          search: function(term, callback) {
            if(term.length < 1) return callback(SUGGESTED_EMOJI);

            var matches = emoji.named.filter(function(emoji) {
              return emoji.indexOf(term) === 0;
            });
            callback(matches);
          },
          template: function(emoji) {
            return emojiListItemTemplate({
              emoji: emoji,
              emojiUrl: cdn('images/gitter/emoji/' + emoji + '.png')
            });
          },
          replace: function (value) {
            return '$1:' + value + ': ';
          }
        },
        {
          match: /(^)\/(\w*)$/,
          maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
          search: function(term, callback) {
            var matches = commands.getSuggestions(term);
            callback(matches);
          },
          template: function(cmd) {
            return listItemTemplate({
              name: cmd.command,
              description: cmd.description
            });
          },
          replace: function (cmd) {
            return '$1/' + cmd.completion;
          }
        }
      ]);

      // Use 'on' and 'off' instead of proper booleans as attributes are strings
      $textarea.on('textComplete:show', function() {
        $textarea.attr('data-prevent-keys', 'on');
      });
      $textarea.on('textComplete:hide', function() {
        // Defer change to make sure the last key event is prevented
        setTimeout(function() {
          $textarea.attr('data-prevent-keys', 'off');
        }, 0);
      });

      // http://stackoverflow.com/questions/16149083/keyboardshrinksview-makes-lose-focus/18904886#18904886
      $textarea.on('touchend', function(){
        window.setTimeout(function() {
          $textarea.focus();
        }, 300);

        return true;
      });

      this.listenTo(this.inputBox, 'save', this.send);
      this.listenTo(this.inputBox, 'subst', this.subst);
      this.listenTo(this.inputBox, 'editLast', this.editLast);
    },

    toggleComposeMode: function(event) {
      if(!event.origin) event.preventDefault();

      this.composeMode.toggle();
      var isComposeModeEnabled = this.composeMode.isEnabled();

      this.$el.find('.compose-mode-toggle')
        .toggleClass('active', isComposeModeEnabled)
        .attr('title', this.getComposeModeTitle())
        .tooltip('fixTitle')
        .tooltip('hide');

      var placeholder = isComposeModeEnabled ? PLACEHOLDER_COMPOSE_MODE : PLACEHOLDER;
      this.$el.find('textarea').attr('placeholder', placeholder).focus();
    },

    /**
     * isStatusMessage() checks whether message is a status ('/me' command).
     *
     * @param <String> message
     * @return <Boolean>
     */
    isStatusMessage: function (message) {
      return /^\/me /.test(message); // if it starts with '/me' it should be a status update
    },

    /**
     * textToStatus() converts a message to a status, removing the '/me' and replacing it with the current user's username
     *
     * @param <String> message
     * @return <Boolean>
     */
    textToStatus: function (message) {
      return message.replace(/^\/me /, '@' + context.getUser().username + ' ');
    },

    /**
     * send() what does send do?
     *
     * @param <String> val describe `val`
     * @return <Boolean>
     */
    send: function (val) {
      if (val) {
        /* baseline for message model */
        var newMessage = {
          text: val,
          fromUser: context.getUser(),
          sent: moment(),
        };

        /* if it is a status message add a key `status` to the Object created above with value `true` */
        if (this.isStatusMessage(newMessage.text)) {
          newMessage.text = this.textToStatus(newMessage.text);
          newMessage.status = true;
        }

        /* create the model */
        var model = this.collection.create(newMessage);

        /* emit event with model created */
        appEvents.trigger('chat.send', model);
      }
      return false;
    },

    getLastEditableMessage: function() {
      var usersChats = this.collection.filter(function(f) {
        var fromUser = f.get('fromUser');
        return fromUser && fromUser.id === context.getUserId();
      });

      usersChats.sort(function(a, b) {
        var as = a.get('sent');
        as = as ? as.valueOf() : 0;
        var bs = b.get('sent');
        bs = bs ? bs.valueOf() : 0;

        return bs - as;
      });

      return usersChats[0];
    },

    subst: function(search, replace, global) {
      var lastChat =  this.getLastEditableMessage();

      if(lastChat) {
        if(Date.now() - lastChat.get('sent').valueOf() <= EDIT_WINDOW) {
          var reString = search.replace(/(^|[^\[])\^/g, '$1');
          var re = new RegExp(reString, global ? "gi" : "i");
          var newText = lastChat.get('text').replace(re, replace);

          lastChat.set({
            text: newText,
            html: null
          }).save();
        }
      }
    },

    editLast: function() {
      if(!this.chatCollectionView) return;

      var lastChat =  this.getLastEditableMessage();
      if(!lastChat) return;

      var chatItemView = this.chatCollectionView.children.findByModel(lastChat);
      if(!chatItemView) return;

      chatItemView.toggleEdit();
    }
  });

  cocktail.mixin(ChatInputView, KeyboardEventsMixin);

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
      $el.height(height);
      if (!editMode) {
        var css = {};

        if(compact) {
          css['padding-bottom'] = (height + EXTRA_PADDING) + 'px';
        } else {
          css['bottom'] = ($('#chat-input-wrapper').outerHeight()) + 'px';
        }

        log('Applying ', css, ' to ', frameChat);
        frameChat.css(css);
      }

      adjustScroll();
    };

    function adjustScroll(initial) {
      if(!rollers) return;
      if(initial) {
        rollers.adjustScroll(500);
      } else {
        rollers.adjustScrollContinuously(500);
      }
    }
  };

  var ChatInputBoxView = TroupeViews.Base.extend({
    events: {
      "keyup":    "onKeyUp",
      "focusout": "onFocusOut"
    },

    keyboardEvents: {
      "chat.edit.openLast": "onKeyEditLast",
      "chat.send": "onKeySend",
      "pageUp": "onKeyPageUp",
      "pageDown": "onKeyPageDown"
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
        editMode: options.editMode,
        rollers: options.rollers
      });

      this.chatResizer = chatResizer;

      this.listenTo(this, 'change', function() {
        chatResizer.resizeInput();
      });

      this.drafty = drafty(this.el);
      if (options.value) {
        this.el.value = this.el.value + options.value;
      }
      chatResizer.resetInput(true);

      this.chatCollectionView = options.chatCollectionView;
      this.composeMode = options.composeMode;
      this.chatResizer.resizeInput();
    },

    onFocusOut: function() {
      if(this.compactView && !this.isTypeaheadShowing()) {
        this.processInput();
      }
    },

    onKeyUp: function() {
      this.chatResizer.resizeInput();
    },

    onKeyEditLast: function() {
      if(!this.$el.val()) this.trigger('editLast');
    },

    onKeySend: function(event, handler) {
      var isComposeModeEnabled = this.composeMode && this.composeMode.isEnabled();
      // Has a modifier or not in compose mode
      var shouldHandle = handler.mods.length || !isComposeModeEnabled;
      // Need to test behaviour with typeahead
      if(!this.isTypeaheadShowing() && shouldHandle) {
        if(this.hasVisibleText()) {
          this.processInput();
        }
        event.preventDefault();
        return false;
      }
    },

    onKeyPageUp: function() {
      if(this.chatCollectionView) this.chatCollectionView.pageUp();
    },

    onKeyPageDown: function() {
      if(this.chatCollectionView) this.chatCollectionView.pageDown();
    },

    processInput: function() {
      var cmd = commands.findMatch(this.$el.val());
      if(cmd && cmd.action) {
        cmd.action(this);
      } else {
        this.send();
      }
    },

    send: function() {
      this.trigger('save', this.$el.val());
      this.reset();
    },

    reset: function() {
      $('#chatInputForm').trigger('reset');
      this.el.value = '';
      this.drafty.reset();
      this.chatResizer.resetInput();
    },

    append: function(text, options) {
      var current = this.$el.val();
      var start = current.length;
      if(!current || current.match(/\s+$/)) {
        current = current + text;
      } else {
        if(options && options.newLine) {
          start++;
          current = current + '\n' + text;
        } else {
          current = current + ' ' + text;
        }
      }
      this.chatResizer.resizeInput();
      this.$el.val(current);
      this.el.setSelectionRange(start, current.length);
      this.el.scrollTop = this.el.clientHeight;
    },

    isTypeaheadShowing: function() {
      return this.$el.parent().find('.dropdown-menu').is(":visible");
    },

    hasVisibleText: function() {
      return !this.$el.val().match(/^\s+$/);
    }
  });

  cocktail.mixin(ChatInputBoxView, KeyboardEventsMixin);

  return { ChatInputView: ChatInputView, ChatInputBoxView: ChatInputBoxView };
});
