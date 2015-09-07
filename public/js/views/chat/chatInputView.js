"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var $ = require('jquery');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var template = require('./tmpl/chatInputView.hbs');
var commands = require('./commands');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var platformKeys = require('utils/platform-keys');
var typeaheads = require('./typeaheads');
var ChatInputBoxView = require('./chat-input-box-view');
var ChatInputButtons = require('./chat-input-buttons');

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

  setTimeout(function() {
    window.localStorage.removeItem('compose_mode_enabled');
  }, 0);

  var ComposeMode = Backbone.Model.extend({
    defaults: {
      isComposeModeEnabled: false,
    }
  });

  var ChatInputView = Marionette.LayoutView.extend({

    template: template,

    behaviors: {
      Widgets: {}
    },

    regions: {
      chatInputButtons: '#chat-input-buttons-region'
    },

    ui: {
      textarea: '#chat-input-textarea'
    },

    events: {
      'paste': 'onPaste'
    },

    keyboardEvents: {
      'chat.compose.auto': 'createCodeBlockOnNewline',
      'chat.toggle': 'toggleComposeMode'
    },

    initialize: function(options) {
      this.bindUIElements(); // TODO: use regions
      this.composeMode = new ComposeMode();
      this.compactView = options.compactView;

      this.listenTo(this.composeMode, 'change', this.updatePlaceholder);

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

    serializeData: function() {
      var isComposeModeEnabled = this.composeMode.get('isComposeModeEnabled');
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
        isComposeModeEnabled: isComposeModeEnabled,
        placeholder: placeholder,
        autofocus: !this.compactView,
        composeModeToggleTitle: this.getComposeModeTitle(),
        showMarkdownTitle: this.getShowMarkdownTitle(),
        value: $("#chat-input-textarea").val()
      };
    },

    onRender: function() {
      var $textarea = this.ui.textarea;

      var inputBox = new ChatInputBoxView({
        el: $textarea,
        composeMode: this.composeMode,
        autofocus: !this.compactView,
        value: $textarea.val(),
        commands: commands,
        template: false
      });
      inputBox.render();

      this.inputBox = inputBox;
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

      this.getRegion('chatInputButtons').show(new ChatInputButtons({ model: this.composeMode }));
    },

    updatePlaceholder: function () {
      var placeholder = this.composeMode.get('isComposeModeEnabled') ? PLACEHOLDER_COMPOSE_MODE : PLACEHOLDER;
      this.ui.textarea.attr('placeholder', placeholder);
    },

    createCodeBlockOnNewline: function (event) {
      var $inputBox = this.inputBox.$el;
      var val = $inputBox.val();

      // only continue if user has just started code block (```)
      var m = val.match(/^```([\w\-]+)?$/);
      if (!m) return;

      // create the rest of the code block
      $inputBox.val(function (index, val) { // jshint unused:true
        return val + '\n\n```';
      });

      // move caret inside the new code block
      this.inputBox.setCaretPosition(m[0].length + 1);

      if (!this.composeMode.get('isComposeModeEnabled')) {
        // switch to compose mode for the lifetime of this message
        this.composeMode.set('isComposeModeEnabled', true);
        this.listenToOnce(this.inputBox, 'save', function() {
          this.composeMode.set('isComposeModeEnabled', false);
        });
      }

      // we've already created a new line so stop the original return event
      event.preventDefault();
    },

    toggleComposeMode: function(event) {
      var newVal = !this.composeMode.get('isComposeModeEnabled');
      this.composeMode.set('isComposeModeEnabled', newVal);
      event.preventDefault();
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

  return ChatInputView;

})();
