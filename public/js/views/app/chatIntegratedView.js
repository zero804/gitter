"use strict";
var $ = require('jquery');
var _ = require('underscore');

var context = require('utils/context');
var Marionette = require('marionette');
var appEvents = require('utils/appevents');
var apiClient = require('components/apiClient');
var uiVars = require('views/app/uiVars');
var chatInputView = require('views/chat/chatInputView');
var itemCollections = require('collections/instances/integrated-items');
var modalRegion = require('components/modal-region');
var hasScrollBars = require('utils/scrollbar-detect');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var ChatCollectionView = require('views/chat/chatCollectionView');
var webhookDecorator = require('views/chat/decorators/webhookDecorator');
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var embedDecorator = require('views/chat/decorators/embedDecorator');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var UnreadBannerView = require('views/app/unreadBannerView');
var HistoryLimitView = require('views/app/historyLimitView');
var unreadItemsClient = require('components/unread-items-client');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');

require('transloadit');

module.exports = (function () {

  var touchEvents = {
    "keypress":                         "onKeyPress",
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  };

  var mouseEvents = {
    "click .js-favourite-button":          "toggleFavourite",
    'paste': 'handlePaste',
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  };

  var ChatLayout = Marionette.Layout.extend({

    el: 'body',

    ui: {
      scrollToBottom: '.js-scroll-to-bottom',
      progressBar: '#file-progress-bar',
      dragOverlay: '.js-drag-overlay'
    },

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    keyboardEvents: {
      'backspace': 'onKeyBackspace',
      'quote': 'onKeyQuote'
    },

    initialize: function () {

      this.bindUIElements();

      // Setup the ChatView - this is instantiated once for the application, and shared between many views
      var chatCollectionView = new ChatCollectionView({
        el: '#chat-container',
        collection: itemCollections.chats,
        userCollection: itemCollections.users,
        decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
      });
      chatCollectionView.bindUIElements();

      this.listenTo(itemCollections.chats, 'atBottomChanged', function (isBottom) {
        this.ui.scrollToBottom.toggleClass('u-scale-zero', isBottom);
      }.bind(this));

      this.rightToolbar = new RightToolbarView({ el: "#right-toolbar-layout" });

      this.chatInputView = new chatInputView.ChatInputView({
        el: '#chat-input',
        collection: itemCollections.chats,
        chatCollectionView: chatCollectionView,
        userCollection: itemCollections.users,
        rollers: chatCollectionView.rollers
      }).render();

      var unreadChatsModel = unreadItemsClient.acrossTheFold();

      itemCollections.chats.once('sync', function () {
        unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
      });

      new UnreadBannerView.Top({
        el: '#unread-banner',
        model: unreadChatsModel,
        chatCollectionView: chatCollectionView
      }).render();

      new UnreadBannerView.Bottom({
        el: '#bottom-unread-banner',
        model: unreadChatsModel,
        chatCollectionView: chatCollectionView
      }).render();

      new HistoryLimitView({
        el: '#limit-banner',
        collection: itemCollections.chats,
        chatCollectionView: chatCollectionView
      }).render();

      this.chatCollectionView = chatCollectionView;
      this.dialogRegion = modalRegion;

      if (hasScrollBars()) {
        $(".primary-scroll").addClass("scroller");
        $(".js-chat-input-container").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }

      this.setupDragAndDrop();
    },

    onKeyBackspace: function (e) {
      e.stopPropagation();
      e.preventDefault();
    },

    onKeyQuote: function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.quoteText();
    },

    getSelectionText: function () {
      var text = "";
      if (window.getSelection) {
        text = window.getSelection().toString();
      } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
      }
      return text;
    },

    quoteText: function () {
      var selectedText = this.getSelectionText();
      if (selectedText.length > 0) {
        appEvents.trigger('input.append', "> " + selectedText, { newLine: true });
      }
    },

    updateProgressBar: function (spec) {
      var bar = this.ui.progressBar;
      var value = typeof spec.value === 'number' ? spec.value.toFixed(0) .toString() : spec.value;
      value = value.slice(-1) === '%' ? value : value + '%';
      var timeout = spec.timeout || 200;
      setTimeout(function () { bar.css('width', value); }, timeout);
    },

    resetProgressBar: function () {
      this.ui.progressBar.hide();
      this.updateProgressBar({
        value: 0,
        timeout: 0
      });
    },

    handleUploadProgress: function (done, expected) {
      var percentage = (done / expected * 100).toFixed(2) + '%';
      this.updateProgressBar({ value: percentage, timeout: 0 });
    },

    handleUploadStart: function () {
      this.ui.progressBar.show();
    },

    handleUploadSuccess: function (res) {
      this.resetProgressBar();

      if (!res.results.files) {
        return;
      }
      appEvents.triggerParent('user_notification', {
        title: 'Upload complete.',
        text: (res.results.files.length > 1) ? res.results.files.length + ' files uploaded.' : 'File uploaded successfully.'
      });
    },

    handleUploadError: function (err) {
      appEvents.triggerParent('user_notification', {
        title: 'Error Uploading File',
        text:  err.message
      });
      this.resetProgressBar();
    },

    setupDragAndDrop: function () {
      var dragOverlay = this.ui.dragOverlay;
      var counter = 0;
      var self = this;

      function ignoreEvent(e) {
        e.stopPropagation();
        e.preventDefault();
      }

      function dropEvent(e) {
        counter = 0;
        dragOverlay.toggleClass('hide', true);
        ignoreEvent(e);
        e = e.originalEvent;
        var files = e.dataTransfer.files;
        self.upload(files);
      }

      this.$el.on('dragenter', function (e) {
        ignoreEvent(e);
        counter++;
        dragOverlay.toggleClass('hide', false);
      });

      this.$el.on('dragleave', function (e) {
        ignoreEvent(e);
        counter--;
        dragOverlay.toggleClass('hide', counter === 0);
      });

      this.$el.on('dragover', ignoreEvent);
      this.$el.on('drop', dropEvent.bind(this));
    },

    isImage: function (blob) {
      return /image\//.test(blob.type);
    },

    handlePaste: function (evt) {
      evt = evt.originalEvent || evt;
      var blob = null;

      if (evt.clipboardData.items.length === 1) {
        blob = evt.clipboardData.items[0].getAsFile();
        if (!blob || !this.isImage(blob)) {
          return;
        } else {
          evt.preventDefault();
          this.upload([blob]);
        }
      }
    },

    upload: function (files) {

      var options = {
        wait: true,
        modal: false,
        autoSubmit: false,
        debug: false,
        onStart: this.handleUploadStart.bind(this),
        onProgress: this.handleUploadProgress.bind(this),
        onSuccess: this.handleUploadSuccess.bind(this),
        onError: this.handleUploadError.bind(this)
      };

      var data = new FormData();
      var type = '';

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var t = file.type.split('/').shift();

        if (!i) {
          type = t;
        } else {
          if (t !== type) {
            type = '';
          }
        }

        data.append('file', file);
      }

      // FIXME: do we need to generate a signature for every file? WC
      apiClient.priv.get('/generate-signature', {
          room_uri: context.troupe().get('uri'),
          room_id: context.getTroupeId(),
          type: type
        })
        .then(function (res) {
          data.append("signature", res.sig);

          var form = $('#upload-form');
          form.find('input[name="params"]').attr('value', res.params);
          form.unbind('submit.transloadit');
          form.transloadit(_.extend(options, { formData: data }));
          form.submit();
        });
    }
  });

  cocktail.mixin(ChatLayout, KeyboardEventsMixin);

  return ChatLayout;

})();

