/* global Promise: true, console: true */
"use strict";
var $ = require('jquery');
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
    // "click #menu-toggle-button":        "onMenuToggle",
    "keypress":                         "onKeyPress",
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  };

  var mouseEvents = {
    "click .js-favourite-button":          "toggleFavourite",
    'paste': 'handlePaste',
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  };

  // Nobody knows why this is here. Delete it
  // $('.trpDisplayPicture').tooltip('destroy');

  var ChatLayout = Marionette.Layout.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
    alertpanel: false,
    files: false,
    originalRightMargin: "",

    ui: {
      scrollToBottom: '.js-scroll-to-bottom',
      progressBar: '#file-progress-bar'
    },

    regions: {
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

      this.enableDragAndDrop();
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
      setTimeout(function () { bar.css('width', value); }.bind(this), timeout);
    },

    resetProgressBar: function () {
      this.ui.progressBar.hide();
      this.updateProgressBar({
        value: 0,
        timeout: 0
      });
    },

    handleUploadProgress: function (done, expected) {
      var percentage = (done / expected * 100 + 20).toFixed(2) + '%';
      this.updateProgressBar(percentage);
    },

    handleUploadStart: function () {
      this.ui.progressBar.show();
    },

    handleUploadSuccess: function () {
      console.debug('handleUploadSuccess() ====================');
    },

    handleUploadError: function (err) {
      console.debug('handleUploadError() ====================');
      appEvents.triggerParent('user_notification', {
        title: "Error uploading file",
        text:  err.message
      });
      this.resetProgressBar();
    },

    enableDragAndDrop: function () {
      var self = this;

      function ignoreEvent(e) {
        e.stopPropagation();
        e.preventDefault();
      }

      function dropEvent(e) {
        ignoreEvent(e);

        self.updateProgressBar({ value: 10, timeout: 50 });
        self.updateProgressBar({ value: 20, timeout: 600 });

        // Prepare formdata
        e = e.originalEvent;
        var files = e.dataTransfer.files;
        if (files.length === 0) {
          self.resetProgressBar();
          return;
        }

        var formdata = new FormData();
        var type = '';
        for(var i = 0; i < files.length; i++) {
          var file = files[i];
          var t = file.type.split('/').shift();

          if(!i) {
            type = t;
          } else {
            if(t !== type) {
              type = '';
            }
          }

          formdata.append("file", file);
        }

        // Generate signature and upload
        apiClient.priv.get('/generate-signature', {
            room_uri: context.troupe().get('uri'),
            room_id: context.getTroupeId(),
            type: type
          })
          .then(function (data) {
            formdata.append("signature", data.sig);

            var options = {
              wait: true,
              modal: false,
              autoSubmit: false,
              onStart: self.handleUploadStart,
              onProgress: self.handleUploadProgress,
              onSuccess: self.handleUploadSuccess,
              onError: this.handleUploadError,
              debug: false,
              formData: formdata
            };

            var form = $('#upload-form');
            form.find('input[name="params"]').attr('value', data.params);
            form.unbind('submit.transloadit');
            form.transloadit(options);
            form.submit();
        });
      }

      var el = $('body');
      el.on('dragenter', ignoreEvent);
      el.on('dragover', ignoreEvent);
      el.on('drop', dropEvent);
    },

    getFileName: function (file) {
      console.debug('getFileName() ====================');
      return new Promise(function (resolve, reject) {
        file.getAsString(function (str) {
          if (!str) {
            return reject(new Error('File has no name'));
          }
          return resolve(str);
        });
      });
    },

    handlePaste: function (evt) {
      console.debug('handlePaste() ====================');
      var self = this;

      if (evt.originalEvent.clipboardData.items.length > 1) {
        var file = evt.originalEvent.clipboardData.items[1].getAsFile();
        if (file.type.indexOf('image/') < 0) {
          console.debug('not an image() ====================');
          return;
        }
        evt.preventDefault();
        Promise.all([
            this.getFileName(evt.originalEvent.clipboardData.items[0]),
            file // sync
          ])
          .then(function (values) {
            self.upload.apply(self, values);
          })
          ['catch'](function (err) {
            console.debug(err);
          });
      }
    },

    upload: function (name, file) {
      console.debug('upload() ====================');
      console.debug('name, file:', name, file);
      this.updateProgressBar({ value: 10, timeout: 50 });
      this.updateProgressBar({ value: 20, timeout: 600 });
      // apiClient.priv.get('/generate-signature', {
      //     room_uri: context.troupe().get('uri'),
      //     room_id: context.getTroupeId(),
      //     type: type
      //   }).then(function () {
      //     // do some
      //   });
    }
  });

  cocktail.mixin(ChatLayout, KeyboardEventsMixin);

  return ChatLayout;

})();

