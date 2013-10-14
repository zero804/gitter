/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'views/base',
  'utils/appevents',
  'hbs!./tmpl/chatInputView',
  'utils/momentWrapper',
  'utils/safe-html',
  'utils/scrollbar-detect',
  'jquery-placeholder', // No ref
  'jquery-sisyphus' // No ref
], function($, context, TroupeViews, appEvents, template, moment, safeHtml, hasScrollBars) {
  "use strict";

  /** @const */
  var maxChatHeight = 150;

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
      this.inputBox = new ChatInputBoxView({
        el: this.$el.find('.trpChatInputBoxTextArea'),
        rollers: this.rollers
      });
      this.$el.find('form').sisyphus({locationBased: true}).restoreAllData();

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

  var ChatInputBoxView = TroupeViews.Base.extend({

    events: {
      "keyup": "detectNewLine",
      "keydown":  "detectReturn",
      "focusout": "onFocusOut"
    },

    // pass in the textarea as el for ChatInputBoxView
    // pass in a scroll delegate
    initialize: function(options) {
      this.rollers = options.rollers;
      this.$el.placeholder();
      if(hasScrollBars()) {
        this.$el.addClass("scroller");
      }
      this.resizeInput();
    },

    onFocusOut: function() {
      if (this.compactView) this.send();
    },

    resetInput: function() {
      this.$el.css({ height: '', 'overflow-y': '' });
    },

    resizeInput: function() {
      var scrollHeight = this.el.scrollHeight;
      var height = scrollHeight > maxChatHeight ? maxChatHeight : scrollHeight;
      var offsetHeight = this.el.offsetHeight;
      if(offsetHeight == height) {
        return;
      }

      var overflow = height < scrollHeight ? 'scroll' : '';
      this.$el.css({ height: height, 'overflow-y': overflow });
      return;
    },

    detectReturn: function(e) {
      if(e.keyCode == 13 && (!e.ctrlKey && !e.shiftKey) && (!this.$el.val().match(/^\s+$/))) {
        e.stopPropagation();
        e.preventDefault();

        this.send();
        return;
      }

      this.resizeInput();
    },

    send: function() {
      this.trigger('save', safeHtml(this.$el.val()));
      $('#chatInputForm').trigger('reset');
      this.$el.val('');
      this.resetInput();
    }
  });

  return { ChatInputView: ChatInputView, ChatInputBoxView: ChatInputBoxView };
});
