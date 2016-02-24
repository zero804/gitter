"use strict";
var $ = require('jquery');
var _ = require('underscore');
var classnames = require('classnames');
var context = require('utils/context');
var chatModels = require('collections/chat');
var AvatarView = require('views/widgets/avatar');
var Marionette = require('backbone.marionette');
var moment = require('moment');
var isMobile = require('utils/is-mobile');
var isAndroid = require('utils/is-android');
var DoubleTapper = require('utils/double-tapper');
var Popover = require('views/popover');
var chatItemTemplate = require('./tmpl/chatItemView.hbs');
var statusItemTemplate = require('./tmpl/statusItemView.hbs');
var actionsTemplate = require('./tmpl/actionsView.hbs');
var ChatEditView = require('views/chat/chat-edit-view');
var appEvents = require('utils/appevents');
var cocktail = require('cocktail');
var chatCollapse = require('utils/collapsed-item-client');
var LoadingCollectionMixin = require('views/loading-mixin');
var FastAttachMixin = require('views/fast-attach-mixin');
var timeFormat = require('gitter-web-shared/time/time-format');
var fullTimeFormat = require('gitter-web-shared/time/full-time-format');
var dataset = require('utils/dataset-shim');

var RAF = require('utils/raf');
var toggle = require('utils/toggle');
require('views/behaviors/unread-items');
require('views/behaviors/widgets');
require('views/behaviors/highlight');
require('views/behaviors/last-message-seen');
require('views/behaviors/timeago');
require('views/behaviors/tooltip');


// Can't use `classList.toggle` with the second parameter (force)
// Because IE11 does not support it
var toggleClass = function(element, class1, force) {
  if(arguments.length === 3) {
    if(force) {
      element.classList.add(class1);
    }
    else {
      element.classList.remove(class1);
    }
  }
  else {
    element.classList.toggle(class1);
  }

  return force;
};


module.exports = (function() {

  var getModelIdClass = function(id) {
    return 'model-id-' + id;
  };

  /* @const */
  var MAX_HEIGHT = 640; /* This value also in chatItemView.less */
  // This needs to be adjusted in chatInputView as well as chat-server on the server
  /* @const */
  var EDIT_WINDOW = 1000 * 60 * 10; // 10 minutes

  var mouseEvents = {
    'click .js-chat-item-edit':       'toggleEdit',
    'click .js-chat-item-collapse':   'toggleCollapse',
    'click .js-chat-item-readby':     'showReadBy',
    'click .js-chat-item-from':       'mentionUser',
    'click .js-chat-time':            'permalink',
    'mouseover .js-chat-item-readby': 'showReadByIntent',
    'click .webhook':                 'expandActivity',
    'click':                          'onClick',
    'click .js-chat-item-actions':    'showActions'
  };

  var touchEvents = {
    // click events are delayed in horrible ways for <iOS 9.3
    'touchstart':                     'onTouchstart',
    'touchmove':                      'onTouchmove',
    'touchend':                       'onTouchend'
  };

  var androidTouchEvents = {
    // WebViews in android will only show the keyboard for a focus() if
    // it happens via a click event, but not for a touch event
    'click':                           'onTap'
  };

  var ChatItemView = Marionette.ItemView.extend({
    attributes: function() {
      var classMap = {
        'chat-item': true
      };

      var id = this.model.get('id');
      if(id) {
        classMap[getModelIdClass(id)] = true;
      }

      return {
        class: classnames(classMap)
      };
    },
    ui: {
      actions: '.js-chat-item-actions',
      collapse: '.js-chat-item-collapse',
      text: '.js-chat-item-text',
      sent: '.js-chat-time',
      timestampLink: '.js-chat-time'
    },

    behaviors: {
      Widgets: {},
      UnreadItems: { },
      Highlight: {},
      LastMessageSeen: {},
      TimeAgo: {
        modelAttribute: 'sent',
        el: '.js-chat-time'
      },
      Tooltip: {
        '.js-chat-time': { titleFn: 'getSentTimeTooltip', html: true },
      }
    },

    modelEvents: {
      'syncStatusChange': 'onSyncStatusChange',
      'change': 'onChange'
    },

    isEditing: false,

    events: function() {
      if (isMobile()) {
        return isAndroid() ? androidTouchEvents : touchEvents;
      } else {
        return mouseEvents;
      }
    },

    expandActivity: function() {
      $('.webhook .commits').slideToggle("fast");
    },

    initialize: function(options) {
      this.rollers = options.rollers;

      this._oneToOne = context.inOneToOneTroupeContext();
      this.isPermalinkable = !this._oneToOne;

      this.userCollection = options.userCollection;

      this.decorated = false;

      // fastclick destroys double tap events
      this.doubleTapper = new DoubleTapper();

      if (this.isInEditablePeriod()) {
        // update once the message is not editable
        var sent = this.model.get('sent');
        var notEditableInMS = sent ? sent.valueOf() - Date.now() + EDIT_WINDOW : EDIT_WINDOW;
        this.timeChangeTimeout = setTimeout(this.timeChange.bind(this), notEditableInMS + 50);
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
      var data = _.clone(this.model.attributes);
      data.model = this.model;

      data.roomName = context.troupe().get('uri');

      if (data.fromUser) {
        data.username = data.fromUser.username;
      }

      // No sent time, use the current time as the message has just been sent
      if (!data.sent) {
        data.sent = moment();
      }

      data.sentTimeFormatted = timeFormat(data.sent);
      data.permalinkUrl = this.getPermalinkUrl();
      data.sentTimeFormattedFull = fullTimeFormat(data.sent);

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
      this.updateRender(this.model.changed);
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

      /* If the content has already been decorated, re-perform the decoration */
      if (this.decorated) {
        this.decorate();
      }
    },

    decorate: function() {
      this.decorated = true;
      this.options.decorators.forEach(function(decorator) {
        decorator.decorate(this);
      }, this);
    },

    onShow: function() {
      // We do this so we don't `appEvents.trigger('navigation')` down the line
      // See `link-handler.js -> installLinkHandler`
      // That event would cause a `router-app.js -> postMessage('permalink.navigate')` to the chat frame and
      // highlight the message, see `router-chat.js -> case 'permalink.navigate'`
      var timestampLinkElement = this.ui.timestampLink[0];
      if(timestampLinkElement) {
        dataset.set(timestampLinkElement, 'disableRouting', true);
      }
    },

    onRender: function () {
      this.updateRender();
      this.timeChange();
    },

    timeChange: function() {
      var canEdit = this.canEdit();
      this.$el.toggleClass('isEditable', this.isInEditablePeriod());
      this.$el.toggleClass('canEdit', canEdit);
      // this.$el.toggleClass('cantEdit', !canEdit);
    },

    updateRender: function(changes) {
      /* NB: `unread` updates occur in the behaviour */
      var model = this.model;
      var $el = this.$el;
      var sentElement = this.ui.sent[0];

      if (!changes || 'html' in changes || 'text' in changes) {
        this.renderText();
      }

      if (changes && 'id' in changes) {
        if(sentElement) {
          var permalinkUrl = this.getPermalinkUrl();
          if (permalinkUrl.length) {
            sentElement.setAttribute('href', permalinkUrl);
          }
        }
      }

      if (changes && 'sent' in changes) {
        if(sentElement) {
          var time = this.model.get('sent');
          if (time) {
            var formattedTime = fullTimeFormat(time);
            sentElement.setAttribute('title', formattedTime);
          }
        }
      }

      this.handleUpdateMentionChanges(changes);
      this.handleUpdateMessageStateChanges(changes);
      this.handleUpdateReadbyStateChanges(changes);
      this.handleUpdateCollapseStateChanges(changes);

      if (!context.isLoggedIn()) this.ui.actions.hide();
    },
    handleUpdateMentionChanges: function(changes) {
      if(!changes || 'mentioned' in changes) {
        var wasMentioned = this.model.get('mentioned');
        toggleClass(this.el, 'mentioned', wasMentioned);
        if(wasMentioned) {
          this.el.setAttribute('aria-live', 'assertive');
          this.el.setAttribute('role', 'alert');
        }
      }
    },
    handleUpdateMessageStateChanges: function(changes) {
      var model = this.model;

      if(!changes || 'fromUser' in changes) {
        toggleClass(this.el, 'isViewers', this.isOwnMessage());
      }

      if(!changes || 'editedAt' in changes) {
        toggleClass(this.el, 'hasBeenEdited', this.hasBeenEdited());
      }

      if(!changes || 'burstStart' in changes) {
        toggleClass(this.el, 'burstStart', !!model.get('burstStart'));
        toggleClass(this.el, 'burstContinued', !model.get('burstStart'));
      }

      if (!changes || 'burstFinal' in changes) {
        toggleClass(this.el, 'burstFinal', !!model.get('burstFinal'));
      }
    },
    handleUpdateReadbyStateChanges: function(changes) {
      /* Don't run on the initial (changed=undefined) as its done in the template */
      // FIXME this is whole thing is pretty ugly, could do with a refactor
      // First iteration: we're not appending the read icon here, just adding a class to display it
      if (changes && 'readBy' in changes) {
        var model = this.model;
        var readByCount = model.get('readBy');
        var oldValue = model.previous('readBy');
        var readByLabel = this.$el.find('.js-chat-item-readby');
        var className = "chat-item__icon--read-by-some";

        if(readByLabel.length === 0) {
          if(readByCount) {
            RAF(function() {
              readByLabel.addClass(className);
            });
          }
        } else {
          if((oldValue === 0) !== (readByCount === 0)) {
            // Things have changed
            readByLabel.toggleClass(className, !!readByCount);
          }
        }
      }
    },
    handleUpdateCollapseStateChanges: function(changes) {
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

    focusInput: function() {
      $("#chat-input-textarea").focus();
    },

    onEditCancel: function() {
      if (!isMobile()) {
        this.focusInput();
      }
      this.toggleEdit();
    },

    onEditSave: function(newText) {
      if (this.isEditing) {
        if (this.canEdit() && newText != this.model.get('text')) {
          this.model.set('text', newText);
          this.model.set('html', null);
          this.model.save();
        }
        if (!isMobile()) {
          this.focusInput();
        }
        this.toggleEdit();
      }
    },

    isOwnMessage: function() {
      if (!this.model.get('fromUser')) return false;
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
      return this.model.id && this.isOwnMessage() && this.isInEditablePeriod() && !this.isEmbedded();
    },

    hasBeenEdited: function() {
      return !!this.model.get('editedAt');
    },

    hasBeenRead: function() {
      return !!this.model.get('readBy');
    },

    onToggleEdit: function() {
      this.toggleEdit();
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

    subst: function(search, replace, global) {
      if(!this.canEdit()) return;

      var reString = search.replace(/(^|[^\[])\^/g, '$1');
      var re = new RegExp(reString, global ? "gi" : "i");
      var newText = this.model.get('text').replace(re, replace);

      this.model.set({
        text: newText,
        html: null
      }).save();
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

    onToggleCollapse: function() {
      this.toggleCollapse();
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
      if (this.inputBox) {
        this.stopListening(this.inputBox);
        this.inputBox.remove();
        delete this.inputBox;
      }

      this.renderText();
    },

    showInput: function() {
      var chatInputText = this.ui.text;

      chatInputText.html("<textarea class='trpChatInput' autofocus></textarea>");

      var unsafeText = this.model.get('text');

      var textarea = chatInputText.find('textarea').val(unsafeText);

      this.inputBox = new ChatEditView({ el: textarea }).render();

      // chrome 48 desktop requires an explicit focus event as `autofocus` is not enough
      // chrome 48 android requires the same, but the first textarea autofocus is fine
      textarea.focus();
      // iOS 9 doesnt put the carat at the end of the text
      textarea.val("").val(unsafeText);

      this.listenTo(this.inputBox, 'save', this.onEditSave);

      // chrome 48 android sends blur events and generally freaks out if you do this
      // in the same event loop or in a requestAnimationFrame
      setTimeout(function() {
        // chrome 48 desktop requires an explicit focus event as `autofocus` is not enough.
        // chrome 48 android requires the same, but the first textarea autofocus is fine.
        textarea.focus();
        // iOS 9 doesnt put the carat at the end of the text
        textarea.val("").val(unsafeText);
      }, 0);

      this.listenTo(this.inputBox, 'cancel', this.onEditCancel);
    },

    showReadByIntent: function(e) {
      ReadByPopover.hoverTimeout(e, function() {
        this.showReadBy(e);
      }, this);
    },

    showReadBy: function(e) {
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

      // Don't show if it's already open.
      if(this.popover) return;

      var actions = new ActionsPopover({
        model: this.model,
        chatItemView: this,
        targetElement: e.target,
        placement: 'horizontal',
        width: '100px'
      });

      this.listenTo(actions, 'render', function() {
        this.ui.actions.addClass('selected');
      }.bind(this));

      this.listenTo(actions, 'destroy', function() {
        this.ui.actions.removeClass('selected');
      }.bind(this));

      actions.show();
      ReadByPopover.singleton(this, actions);
    },

    mentionUser: function () {
     var mention = "@" + this.model.get('fromUser').username + " ";
     appEvents.trigger('input.append', mention);
    },

    permalink: function(e) {
      if(!this.isPermalinkable) return;

      // Can't permalink a chat which hasn't been saved to the server yet
      if (!this.model.id) return;

      // Holding the Alt key down while clicking adds the permalink to the chat input
      appEvents.trigger('permalink.requested', 'chat', this.model, { appendInput: !!e.altKey });

      e.preventDefault();
    },

    highlight: function() {
      var self = this;
      this.$el.addClass('chat-item__highlighted');
      setTimeout(function() {
        self.$el.removeClass('chat-item__highlighted');
      }, 5000);
    },

    onTouchstart: function() {
      this.isDragging = false;
    },

    onTouchmove: function() {
      this.isDragging = true;
    },

    onTouchend: function() {
      if (!this.isDragging) {
        // its a tap!
        this.onTap();
      } else {
        // just a drag finishing. not a tap.
        this.isDragging = false;
      }
    },

    onTap: function() {
      var tapCount = this.doubleTapper.registerTap();

      switch (tapCount) {
        case 1:
          // single click
          // this calls onSelected
          this.triggerMethod('selected', this.model);
          break;
        case 2:
          // double click
          this.toggleEdit();
          break;
      }
    },

    onTouchEditBlur: function() {
      if(this.inputBox) {
        this.toggleEdit();
      }
    },

    onClick: function(jqueryEvent) {
      var event = jqueryEvent.originalEvent;

      switch (event.detail) {
        case 1:
          // single click
          // this calls onSelected
          this.triggerMethod('selected', this.model);
          break;
        case 2:
          // double click!
          break;
        case 3:
          // m-m-m-monster click!
          if (window.getSelection) {
            // used for html copy
            window.getSelection().selectAllChildren(this.el);
          }
          break;
      }
    },

    onSyncStatusChange: function(newState) {
      this.$el
        .toggleClass('synced', newState == 'synced')
        .toggleClass('syncing', newState == 'syncing')
        .toggleClass('syncerror', newState == 'syncerror');
    },

    getPermalinkUrl: function() {
      if(!this.isPermalinkable) return '';

      var modelId = this.model.id;
      if (!modelId) return '';

      var uri = context.troupe().get('uri');
      if (!uri) return '';

      return context.env('basePath') + '/' + uri + '?at=' + modelId;
    },

    getSentTimeTooltip: function() {
      var time = this.model.get('sent');
      if (!time) return '';
      var formatted = time.format('LLL');
      if (this.isPermalinkable && formatted) {
        formatted += '  <br>(Alt-click to quote)';
      }

      return formatted;
    },

    attachElContent: FastAttachMixin.attachElContent
  });

  var ReadByView = Marionette.CollectionView.extend({
    childView: AvatarView,
    className: 'popoverReadBy',
    initialize: function(options) {
      this.collection = new chatModels.ReadByCollection(null, { listen: true, chatMessageId: this.model.id, userCollection: options.userCollection });
      this.collection.loading = true; // Messy workaround until the loading-mixin handles loading/loaded transitions correctly
    },
    onDestroy: function() {
      var readByCollection = this.collection;

      // The unlisten will send out a reset, which may cause problems, unlisten manually
      this.stopListening(readByCollection);
      readByCollection.unlisten();

      // Stop listening to events (memory leaks)
      readByCollection.stopListening();
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
      'click .js-chat-action-reply': 'reply',
      'click .js-chat-action-quote': 'quote',
      'click .js-chat-action-delete': 'delete'
    },
    toggleCollapse: function() {
      this.chatItemView.triggerMethod('toggleCollapse');
    },
    edit: function() {
      this.chatItemView.triggerMethod('toggleEdit');
    },
    reply: function() {
      var mention = "@" + this.model.get('fromUser').username + " ";
      appEvents.trigger('input.append', mention);
    },
    quote: function() {
      appEvents.trigger('input.append', "> " + this.model.get('text'), { newLine: true });
    },
    delete: function() {
      this.model.set('text', '');
      this.model.save();
    },
    serializeData: function() {
      var deleted = !this.model.get('text');
      var data = {actions: [
        {name: 'reply', description: 'Reply'}
      ]};

      if (!deleted) data.actions.push({name: 'quote', description: 'Quote'});

      // FIXME Can't really use a triggerMethod here, maybe move the logic of canEdit() to this view?
      if (!deleted && this.chatItemView.canEdit()) {
        data.actions.push({name: 'edit', description: 'Edit'});
        data.actions.push({name: 'delete', description: 'Delete'});
      } else {
        data.actions.push({name: 'edit', description: 'Edit', disabled: true});
        data.actions.push({name: 'delete', description: 'Delete', disabled: true});
      }


      if (!deleted && this.model.get('isCollapsible')) {
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
