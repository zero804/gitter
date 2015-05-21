"use strict";
var Marionette = require('backbone.marionette');
var $ = require('jquery');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var template = require('./tmpl/chatInputView.hbs');
var hasScrollBars = require('utils/scrollbar-detect');
var isMobile = require('utils/is-mobile');
var drafty = require('components/drafty');
var commands = require('./commands');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var platformKeys = require('utils/platform-keys');
var typeaheads = require('./typeaheads');
require('bootstrap_tooltip');
require('jquery-textcomplete');

module.exports = (function() {

  /* This value is also in chatItemView and in chat-service on the server*/
  /** @const */
  var EDIT_WINDOW = 1000 * 60 * 10; // 10 minutes

  /** @const */
  var MOBILE_PLACEHOLDER = 'Touch here to type a chat message.';

  /** @const */
  var PLACEHOLDER = 'Click here to type a chat message. Supports GitHub flavoured markdown.';

  /** @const */
  var PLACEHOLDER_COMPOSE_MODE = PLACEHOLDER+' '+ platformKeys.cmd +'+Enter to send.';

  function calculateMaxHeight() {
    // TODO: this sucks. normalise everything to HEADER
    var header = $("#header-wrapper");
    if(!header.length) header = $("header");

    var headerHeight = header.height();

    return $(document).height() - headerHeight - 140;
  }

  var ComposeMode = function() {
    var stringBoolean = window.localStorage.getItem('compose_mode_enabled') || 'false';
    this.disabled = JSON.parse(stringBoolean);
  };

  /**
   * setCaretPosition() moves the caret on a given text element
   * credits to http://blog.vishalon.net/index.php/javascript-getting-and-setting-caret-position-in-textarea/
   */
  var setCaretPosition = function (el, pos) {
    if (el.setSelectionRange) {
      el.focus();
      el.setSelectionRange(pos,pos);
      return;
    } else if (el.createTextRange) {
      var range = el.createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
      return;
    }
  };

  ComposeMode.prototype.toggle = function() {
    this.disabled = !this.disabled;
    var stringBoolean = JSON.stringify(this.disabled);
    window.localStorage.setItem('compose_mode_enabled', stringBoolean);
  };

  ComposeMode.prototype.isEnabled = function() {
    return this.disabled;
  };

  var ChatInputView = Marionette.ItemView.extend({

    template: template,

    behaviors: {
      Widgets: {}
    },

    ui: {
      composeToggle: '.js-toggle-compose-mode',
      textarea: '#chat-input-textarea',
      mdHelp: '.js-md-help'
    },

    events: {
      'click @ui.composeToggle': 'toggleComposeMode',
      'paste': 'onPaste'
    },

    keyboardEvents: {
      'chat.compose.auto': 'composeModeAutoFillCodeBlock',
      'chat.toggle': 'toggleComposeMode'
    },

    initialize: function(options) {
      this.bindUIElements(); // TODO: use regions
      this.composeMode = new ComposeMode();
      this.compactView = options.compactView;

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

    serializeData: function() {
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
        autofocus: !this.compactView,
        composeModeToggleTitle: this.getComposeModeTitle(),
        showMarkdownTitle: 'Markdown help ('+ platformKeys.cmd +' + '+ platformKeys.gitter +' + m)',
        value: $("#chat-input-textarea").val()
      };
    },

    onRender: function() {
      var $textarea = this.ui.textarea;

      // firefox only respects the "autofocus" attr if it is present on source html
      // also, dont show keyboard right away on mobile
      // Also, move the cursor to the end of the textarea text
      if (!this.compactView) setCaretPosition($textarea[0], $textarea.val().length);

      var inputBox = new ChatInputBoxView({
        el: $textarea,
        composeMode: this.composeMode,
        autofocus: !this.compactView,
        value: $textarea.val()
      });

      this.inputBox = inputBox;
      this.ui.composeToggle.tooltip({ placement: 'left' });
      this.ui.mdHelp.tooltip({ placement: 'left' });

      $textarea.textcomplete(typeaheads);

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

    toggleComposeMode: function (event) {
      if(event && !event.origin) event.preventDefault();

      this.composeMode.toggle();
      var isComposeModeEnabled = this.composeMode.isEnabled();

      this.ui.composeToggle
        .attr('title', this.getComposeModeTitle())
        .tooltip('fixTitle')
        .tooltip('hide');

      var $icon = this.ui.composeToggle.find('i');
      // remove all classes from icon
      $icon.removeClass();
      $icon.addClass(isComposeModeEnabled ? 'icon-keyboard-1' : 'icon-chat-alt');

      var placeholder = isComposeModeEnabled ? PLACEHOLDER_COMPOSE_MODE : PLACEHOLDER;
      this.$el.find('textarea').attr('placeholder', placeholder).focus();
    },

    /**
     * composeModeAutoFillCodeBlock() automatically toggles compose mode and creates a Marked down codeblock template
     */
    composeModeAutoFillCodeBlock: function (event) {
      var inputBox = this.inputBox.$el;
      if (inputBox.val() !== '```') return; // only continue if the content is '```'
      var wasInChatMode = !this.composeMode.isEnabled();

      event.preventDefault(); // shouldn't allow the creation of a new line

      if (wasInChatMode) {
        this.toggleComposeMode(event); // switch to compose mode
        this.listenToOnce(this.inputBox, 'save', this.toggleComposeMode.bind(this, null)); // if we were in chat mode make sure that we set the state back to chat mode
      }

      inputBox.val(function (index, val) { // jshint unused:true
        return val + '\n\n```'; // 1. create the code block
      });

      setCaretPosition(inputBox[0], 4); // 2. move caret inside the block (textarea)
    },

    /**
     * isStatusMessage() checks whether message is a status ('/me' command).
     *
     * @param <String> message
     * @return <Boolean>
     */
    isStatusMessage: function (message) {
      return (/^\/me /).test(message); // if it starts with '/me' it should be a status update
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
          sent: null,
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

      return usersChats[usersChats.length - 1];
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
      var lastChat =  this.getLastEditableMessage();
      if(!lastChat) return;
      appEvents.trigger('chatCollectionView:editChat', lastChat);
    },

    onPaste: function(e) {
      if (e.originalEvent) e = e.originalEvent;
      if (!e.clipboardData) return;
      var markdown = e.clipboardData.getData('text/x-markdown');

      if (markdown) {
        var val = this.ui.textarea.val();
        var el = this.ui.textarea[0];

        var selectionStart = el.selectionStart;
        var selectionEnd = el.selectionEnd;

        el.value = val.substring(0, selectionStart) + markdown + val.substring(selectionEnd);

        el.selectionStart = el.selectionEnd = selectionStart + markdown.length;
        e.preventDefault();
      }
    }
  });

  cocktail.mixin(ChatInputView, KeyboardEventsMixin);

  var ChatCollectionResizer = function(options) {
    var el = options.el;
    var $el = $(el);

    this.resetInput = function(initial) {
      $el.css({ height: '', 'overflow-y': '' });

      adjustScroll(initial);
    };

    this.resizeInput = function() {
      var maxHeight = calculateMaxHeight();
      var scrollHeight = el.scrollHeight;
      var height = scrollHeight > maxHeight ? maxHeight : scrollHeight;
      var offsetHeight = el.offsetHeight;

      if(offsetHeight == height) {
        return;
      }

      $el.height(height);

      adjustScroll();
    };

    function adjustScroll(initial) {
      /* Tell the chatCollectionView that the viewport will resize
       * the argument is whether the resize is animated */
      appEvents.trigger('chatCollectionView:viewportResize', !initial);
    }
  };

  var ChatInputBoxView = Marionette.ItemView.extend({
    events: {
      "keyup": "onKeyUp",
      "keydown": "onKeyDown",
      "blur": "onBlur"
    },

    keyboardEvents: {
      "chat.edit.openLast": "onKeyEditLast",
      "chat.send": "onKeySend"
    },

    // pass in the textarea as el for ChatInputBoxView
    // pass in a scroll delegate
    initialize: function(options) {
      this.autofocus = options.autofocus;

      if(hasScrollBars()) {
        this.$el.addClass("scroller");
      }

      var chatResizer = new ChatCollectionResizer({
        el: this.el
      });

      this.chatResizer = chatResizer;

      this.listenTo(this, 'change', function() {
        chatResizer.resizeInput();
      });

      if (!this.options.editMode) this.drafty = drafty(this.el);

      chatResizer.resetInput(true);

      this.composeMode = options.composeMode;
      this.chatResizer.resizeInput();
    },

    onBlur: function() {
      if(isMobile() && !this.isTypeaheadShowing()) {
        this.processInput();
      }
    },
    onKeyDown: function(e) {
      if (e.keyCode === 33 || e.keyCode === 34) {
        appEvents.trigger(e.keyCode === 33 ? 'chatCollectionView:pageUp' : 'chatCollectionView:pageDown');
        e.stopPropagation();
        e.preventDefault();
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
      if (this.drafty) this.drafty.reset(); // Drafty is disabled in editMode
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
      this.el.setSelectionRange(current.length, current.length);
      this.el.focus();

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

})();
