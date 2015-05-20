"use strict";
var $ = require('jquery');
var _ = require('underscore');
var context = require('utils/context');
var chatModels = require('collections/chat');
var AvatarView = require('views/widgets/avatar');
var Marionette = require('backbone.marionette');
var moment = require('moment');
var uiVars = require('views/app/uiVars');
var Popover = require('views/popover');
var chatItemTemplate = require('./tmpl/chatItemView.hbs');
var statusItemTemplate = require('./tmpl/statusItemView.hbs');
var actionsTemplate = require('./tmpl/actionsView.hbs');
var chatInputView = require('views/chat/chatInputView');
var appEvents = require('utils/appevents');
var cocktail = require('cocktail');
var chatCollapse = require('utils/collapsed-item-client');
var KeyboardEventMixins = require('views/keyboard-events-mixin');
var LoadingCollectionMixin = require('views/loading-mixin');


var RAF = require('utils/raf');
var toggle = require('utils/toggle');
require('views/behaviors/unread-items');
require('views/behaviors/widgets');
require('views/behaviors/sync-status');
require('views/behaviors/highlight');
require('views/behaviors/tooltip');

module.exports = (function() {


  /* @const */
  var MAX_HEIGHT = 640; /* This value also in chatItemView.less */
  // This needs to be adjusted in chatInputView as well as chat-server on the server
  /* @const */
  var EDIT_WINDOW = 1000 * 60 * 10; // 10 minutes

  var msToMinutes = function (ms) {
    return ms / (60 * 1000);
  };

  var mouseEvents = {
    'click .js-chat-item-edit':       'toggleEdit',
    'click .js-chat-item-collapse':   'toggleCollapse',
    'click .js-chat-item-readby':     'showReadBy',
    'click .js-chat-item-from':       'mentionUser',
    'click .js-chat-item-time':       'permalink',
    'mouseover .js-chat-item-readby': 'showReadByIntent',
    'click .webhook':                 'expandActivity',
    'click':                          'onClick',
    'dblclick':                       'onDblClick',
    'click .js-chat-item-actions':    'showActions'
  };

  var touchEvents = {
    'click .js-chat-item-edit':       'toggleEdit',
    "click":                          'onTouchClick'
  };

  var ChatItemView = Marionette.ItemView.extend({
    attributes: {
      class: 'chat-item'
    },

    ui: {
      collapse: '.js-chat-item-collapse',
      text: '.js-chat-item-text'
    },

    behaviors: {
      Widgets: {},
      Tooltip: {
        '.js-chat-item-edit': { titleFn: 'getEditTooltip' },
        '.js-chat-item-collapse': { titleFn: 'getCollapseTooltip' }
      },
      UnreadItems: {
        unreadItemType: 'chat',
      },
      SyncStatus: {},
      Highlight: {}
    },

    isEditing: false,

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    keyboardEvents: {
      'chat.edit.escape': 'onKeyEscape',
      'chat.edit.send': 'onKeySend'
    },

    expandActivity: function() {
      $('.webhook .commits').slideToggle("fast");
    },

    initialize: function(options) {
      this.rollers = options.rollers;

      this.listenToOnce(this.model, 'change:unread', function() {
        if (!this.model.get('unread')) {
          this.$el.removeClass('unread');
        }
      });

      this._oneToOne = context.inOneToOneTroupeContext();
      this.isPermalinkable = !this._oneToOne;

      this.userCollection = options.userCollection;

      this.decorators = options.decorators;

      this.listenTo(this.model, 'change', this.onChange);

      var timeChange = this.timeChange.bind(this);
      if (this.isInEditablePeriod()) {
        // update once the message is not editable
        var sent = this.model.get('sent');
        var notEditableInMS = sent ? sent.valueOf() - Date.now() + EDIT_WINDOW : EDIT_WINDOW;
        this.timeChangeTimeout = setTimeout(timeChange, notEditableInMS + 50);
      }

      this.listenToOnce(this, 'messageInViewport', this.decorate);
    },

    onDestroy: function() {
      clearTimeout(this.timeChangeTimeout);
    },

    template: function(data) {
      if (data.status) {
        return statusItemTemplate(data);
      }

      return chatItemTemplate(data);
    },

    serializeData: function() {
      var data = this.model.toJSON();

      if (data.fromUser) {
        data.username = data.fromUser.username;
      }

      // No sent time, use the current time as the message has just been sent
      if (!data.sent) {
        data.sent = moment();
      }

      data.readByText = this.getReadByText(data.readBy);
      if(!data.html) {
        data.html = _.escape(data.text);
      }
      data.isPermalinkable = this.isPermalinkable;
      return data;
    },

    getReadByText: function(readByCount) {
      if(!readByCount) return '';
      if(this._oneToOne) return ' ';
      if(readByCount > 10) readByCount = 10;
      return readByCount;
    },

    onChange: function() {
      var changed = this.model.changed;

      if ('html' in changed) {
        this.renderText();
      }

      this.updateRender(this.model.changed);
    },

    onKeyEscape: function() {
      if(this.inputBox) {
        this.toggleEdit();
        this.focusInput();
      }
    },

    onKeySend: function(event) {
      if(this.inputBox) {
        this.inputBox.processInput();
      }
      event.preventDefault();
    },

    renderText: function() {
      var model = this.model;

      // Will only use the text when a value hasn't been returned from the server
      var html = model.get('html') || _.escape(model.get('text'));

      // Handle empty messages as deleted
      if (html.length === 0) {
        html = '<i>This message was deleted</i>';
        this.$el.addClass('deleted');
      }

      // This needs to be fast. innerHTML is much faster than .html()
      // by an order of magnitude
      this.ui.text[0].innerHTML = html;
    },

    decorate: function() {
      this.decorators.forEach(function(decorator) {
        decorator.decorate(this);
      }, this);
    },

    onRender: function () {
      this.renderText();
      this.updateRender();
      this.timeChange();
    },


    timeChange: function() {
      this.$el.toggleClass('isEditable', this.isInEditablePeriod());
      this.$el.toggleClass('canEdit', this.canEdit());
      this.$el.toggleClass('cantEdit', !this.canEdit());
    },

    updateRender: function(changes) {
      if(!changes || 'fromUser' in changes) {
        this.$el.toggleClass('isViewers', this.isOwnMessage());
      }

      if(!changes || 'editedAt' in changes) {
        this.$el.toggleClass('hasBeenEdited', this.hasBeenEdited());
      }

      if(!changes || 'burstStart' in changes) {
        this.$el.toggleClass('burstStart', this.model.get('burstStart'));
        this.$el.toggleClass('burstContinued', !this.model.get('burstStart'));
      }

      if (!changes || 'burstFinal' in changes) {
        this.$el.toggleClass('burstFinal', this.model.get('burstFinal'));
      }

      /* Don't run on the initial (changed=undefined) as its done in the template */
      if (changes && 'readBy' in changes) {
        var readByCount = this.model.get('readBy');
        var oldValue = this.model.previous('readBy');

        var readByLabel = this.$el.find('.js-chat-item-readby');

        if(readByLabel.length === 0) {
          if(readByCount) {
           readByLabel = $(document.createElement('div')).addClass('chat-item__icon--read js-chat-item-readby');
           readByLabel.insertBefore(this.$el.find('.js-chat-item-edit'));

           RAF(function() {
             readByLabel.addClass('readBySome');
           });
          }
        } else {
          if((oldValue === 0) !== (readByCount === 0)) {
            // Things have changed
            readByLabel.toggleClass('readBySome', !!readByCount);
          }
        }
      }

      if(changes && 'collapsed' in changes) {
        var collapsed = this.model.get('collapsed');
        if(collapsed) {
          this.collapseEmbeds();
        } else {
          this.expandEmbeds();
        }

      }

      if(!changes || 'isCollapsible' in changes) {
        var isCollapsible = !!this.model.get('isCollapsible');
        var $collapse = this.ui.collapse;
        toggle($collapse[0], isCollapsible);
          }
    },

    getEditTooltip: function() {
      if (this.isEmbedded()) return "You can't edit on embedded chats.";

      if(this.hasBeenEdited()) {
        return "Edited shortly after being sent";
      }

      if(this.canEdit()) {
        return "Edit within " + msToMinutes(EDIT_WINDOW) + " minutes of sending";
      }

      if(this.isOwnMessage()) {
        return "It's too late to edit this message.";
      }

      return  "You can't edit someone else's message";
    },

    getCollapseTooltip: function() {
      if (this.model.get('collapsed')) {
        return  "Show media.";
      }
      return "Hide media.";
    },

    getCollapsedTooltip: function() {
      // also for expanded
      return  "Displaying message, click here to collapse.";
    },

    focusInput: function() {
      $("#chat-input-textarea").focus();
    },

    saveChat: function(newText) {
      if (this.isEditing) {
        if (this.canEdit() && newText != this.model.get('text')) {
          this.model.set('text', newText);
          this.model.set('html', null);
          this.model.save();
        }
        this.focusInput();
        this.toggleEdit();
      }
    },

    isOwnMessage: function() {
      if (this.model.get('fromUser') === null) return false;
      return this.model.get('fromUser').id === context.getUserId();
    },

    isInEditablePeriod: function() {
      var sent = this.model.get('sent');

      if (!sent) return true; // No date means the message has not been sent
      var age = Date.now() - sent.valueOf();
      return age <= EDIT_WINDOW;
    },

    isEmbedded: function () {
      return context().embedded;
    },

    canEdit: function() {
      return this.isOwnMessage() && this.isInEditablePeriod() && !this.isEmbedded();
    },

    hasBeenEdited: function() {
      return !!this.model.get('editedAt');
    },

    hasBeenRead: function() {
      return !!this.model.get('readBy');
    },

    toggleEdit: function() {
      if (this.isEditing) {
        this.isEditing = false;
        this.showText();
        this.stopListening(appEvents, 'focus.request.chat.edit');
        appEvents.trigger('chat.edit.hide');
      } else {
        if (this.canEdit()) {
          var self = this;
          this.isEditing = true;
          this.showInput();
          this.listenTo(appEvents, 'focus.request.chat.edit', function() {
            self.inputBox.$el.focus();
            appEvents.trigger('focus.change.chat.edit');
          });
          appEvents.trigger('chat.edit.show');
        }
      }
    },

    setCollapse: function (state) {
      state = !!state;
      var chatId = this.model.get('id');
      var collapsed = !!this.model.get('collapsed');
      if(state === collapsed) return;

      if (collapsed) {
        chatCollapse.uncollapse(chatId);
      } else {
        chatCollapse.collapse(chatId);
      }
      this.model.set('collapsed', !collapsed);
    },

    // deals with collapsing images and embeds
    toggleCollapse: function () {
      var collapsed = this.model.get('collapsed');
      this.setCollapse(!collapsed);
    },

    collapseEmbeds: function() {
      // this.bindUIElements();
      var self = this;
      var embeds = self.$el.find('.embed');
      var icon = this.ui.collapse.find('i');

      clearTimeout(self.embedTimeout);

      this.ui.collapse.removeClass('chat-item__icon--collapse');
      this.ui.collapse.addClass('chat-item__icon--expand');
      icon.removeClass('octicon-fold');
      icon.addClass('octicon-unfold');

      if(self.rollers) {
        embeds.each(function(i, e) { // jshint unused:true
          self.rollers.startTransition(e, 500);
        });
      }

      embeds.css("overflow", undefined);
      embeds.css("max-height", "0");
      embeds.addClass('animateOut');

      // Remove after
      self.embedTimeout = setTimeout(function() {
        self.renderText();
      }, 600);
    },

    expandEmbeds: function() {
      // this.bindUIElements();
      var self = this;
      clearTimeout(self.embedTimeout);
      var icon = this.ui.collapse.find('i');

      icon.addClass('octicon-fold');
      icon.removeClass('octicon-unfold');
      this.ui.collapse.removeClass('chat-item__icon--expand');
      this.ui.collapse.addClass('chat-item__icon--collapse');

      function adjustMaxHeight(embeds) {
        setTimeout(function() {
          embeds.each(function(i, e) { // jshint unused:true
            var h = $(e).height();
            if(h <= MAX_HEIGHT) {
              $(e).css("max-height", h + "px");
            } else {
              $(e).css("overflow", "hidden");
            }
          });
        }, 3000);
      }

      // Used by the decorator
      self.expandFunction = function(embed) {
        embed.addClass('animateOut');

        RAF(function() {

          if(self.rollers) {
            self.rollers.startTransition(embed, 500);
          }

          embed.removeClass('animateOut');
          adjustMaxHeight(embed);
        });
      };

      self.renderText();
      self.decorate();

      // Give the browser a second to load the content
      self.embedTimeout = setTimeout(function() {
        var embeds = self.$el.find('.embed');

        if(self.rollers) {
          embeds.each(function(i, e) {  // jshint unused:true
            self.rollers.startTransition(e, 500);
          });
        }

        embeds.removeClass('animateOut');

        adjustMaxHeight(embeds);
      }, 10);
    },

    showText: function() {
      this.renderText();

      if (this.inputBox) {
        this.stopListening(this.inputBox);
        this.inputBox.remove();
        delete this.inputBox;
      }
    },

    showInput: function() {
      //var isAtBottom = this.scrollDelegate.isAtBottom();
      var chatInputText = this.ui.text;

      // create inputview
      chatInputText.html("<textarea class='trpChatInput'></textarea>");

      var unsafeText = this.model.get('text');

      var textarea = chatInputText.find('textarea').val(unsafeText);

      RAF(function() {
        textarea.focus();
        textarea.val("").val(unsafeText);
      });

      this.inputBox = new chatInputView.ChatInputBoxView({ el: textarea, editMode: true });
      this.listenTo(this.inputBox, 'save', this.saveChat);
    },

    showReadByIntent: function(e) {
      ReadByPopover.hoverTimeout(e, function() {
        this.showReadBy(e);
      }, this);
    },

    showReadBy: function(e) {
      if (this.compactView) return;

      if(this.popover) return;
      e.preventDefault();

      var popover = new ReadByPopover({
        model: this.model,
        userCollection: this.userCollection,
        scroller: this.$el.parents('.primary-scroll'), // TODO: make nice
        placement: 'vertical',
        minHeight: '88px',
        width: '300px',
        title: 'Read By',
        targetElement: e.target
      });

      popover.show();
      ReadByPopover.singleton(this, popover);
    },

    showActions: function(e) {
      e.preventDefault();
      if(this.popover) return;
      e.preventDefault();

      var actions = new ActionsPopover({
        model: this.model,
        chatItemView: this,
        targetElement: e.target,
        placement: 'horizontal',
        width: '200px'
      });

      actions.show();
      ReadByPopover.singleton(this, actions);
    },

    mentionUser: function () {
      var mention = "@" + this.model.get('fromUser').username + " ";
      appEvents.trigger('input.append', mention);
    },

    permalink: function(e) {
      if(!this.isPermalinkable) return;

      /* Holding the Alt key down while clicking adds the permalink to the chat input */
      appEvents.trigger('permalink.requested', 'chat', this.model, { appendInput: !!e.altKey });
    },

    highlight: function() {
      var self = this;
      this.$el.addClass('chat-item__highlighted');
      setTimeout(function() {
        self.$el.removeClass('chat-item__highlighted');
      }, 5000);
    },
    onTouchClick: function() {
      // this calls onSelected
      this.triggerMethod('selected', this.model);
    },

    onClick: function() {
      // this calls onSelected
      this.triggerMethod('selected', this.model);

      if (!window.getSelection) return;
      if (this.dblClickTimer) {
        clearTimeout(this.dblClickTimer);
        this.dblClickTimer = null;
        window.getSelection().selectAllChildren(this.el);
      }
    },

    onDblClick: function() {
      if (!window.getSelection) return;
      var self = this;
      self.dblClickTimer = setTimeout(function () {
        self.dblClickTimer = null;
      }, 200);
    }

  });

  cocktail.mixin(ChatItemView, KeyboardEventMixins);

  var ReadByView = Marionette.CollectionView.extend({
    childView: AvatarView,
    className: 'popoverReadBy',
    initialize: function(options) {
      var c = new chatModels.ReadByCollection(null, { listen: true, chatMessageId: this.model.id, userCollection: options.userCollection });
      c.loading = true;
      this.collection = c;
    },
    onDestroy: function(){
      this.collection.unlisten();
    }
  });
  cocktail.mixin(ReadByView, LoadingCollectionMixin);

  var ReadByPopover = Popover.extend({
    initialize: function(options) {
      Popover.prototype.initialize.apply(this, arguments);
      this.view = new ReadByView({ model: this.model, userCollection: options.userCollection });
    }
  });

  var ActionsView = Marionette.ItemView.extend({
    template: actionsTemplate,
    initialize: function(options) {
      this.chatItemView = options.chatItemView;
    },
    events: {
      'click .js-chat-action-collapse': 'toggleCollapse',
      'click .js-chat-action-expand': 'toggleCollapse',
      'click .js-chat-action-edit': 'edit',
      'click .js-chat-action-mention': 'mention'
    },
    toggleCollapse: function() {
      this.chatItemView.toggleCollapse();
    },
    edit: function() {
      this.chatItemView.toggleEdit();
    },
    mention: function() {
      this.chatItemView.mentionUser();
    },
    serializeData: function() {
      var data = {actions: []};
      data.actions.push({name: 'mention', description: 'Mention ' + this.model.get('fromUser').username});

      if (this.chatItemView.canEdit()) data.actions.push({name: 'edit', description: 'Edit'});
      if (this.model.get('isCollapsible')) {
        var action = this.model.get('collapsed') ? {name: 'expand', description: 'Expand'} : {name: 'collapse', description: 'Collapse'};
        data.actions.push(action);
      }

      return data;
    }
  });

  var ActionsPopover = Popover.extend({
    initialize: function(options) {
      Popover.prototype.initialize.apply(this, arguments);
      this.view = new ActionsView({ model: this.model, chatItemView: options.chatItemView });
    },
    events: {
      'click': 'hide'
    }
  });

  return {
    ChatItemView: ChatItemView,
    ReadByView: ReadByView,
    ReadByPopover: ReadByPopover,
    ActionsView: ActionsView,
    ActionsPopover: ActionsPopover
  };


})();
