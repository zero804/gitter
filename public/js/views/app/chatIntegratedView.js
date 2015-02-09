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
var P = require('es6-promise').Promise;
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
      // console.debug('updateProgressBar() ====================');
      var bar = this.ui.progressBar;
      var value = typeof spec.value === 'number' ? spec.value.toFixed(0) .toString() : spec.value;
      value = value.slice(-1) === '%' ? value : value + '%';
      var timeout = spec.timeout || 200;
      // console.debug(value);
      setTimeout(function () { bar.css('width', value); }, timeout);
    },

    resetProgressBar: function () {
      // console.debug('resetProgressBar() ====================');
      this.ui.progressBar.hide();
      this.updateProgressBar({
        value: 0,
        timeout: 0
      });
    },

    handleUploadProgress: function (done, expected) {
      // console.debug('handleUploadProgress() ====================');
      // console.debug('done, expected:', done, expected);
      // console.debug('arguments:', arguments);
      var percentage = (done / expected * 100).toFixed(2) + '%';
      this.updateProgressBar({ value: percentage, timeout: 0 });
    },

    handleUploadStart: function () {
      // console.debug('handleUploadStart() ====================');
      this.ui.progressBar.show();
    },

    handleUploadSuccess: function (res) {
      // console.debug('handleUploadSuccess() ====================');
      // console.debug(arguments);
      this.resetProgressBar();
      appEvents.triggerParent('user_notification', {
        title: (res.results.files.length > 1) ? res.results.files.length + ' files uploaded.' : res.results.files[0].name,
        text: 'Upload complete.'
      });
    },

    handleUploadError: function (err) {
      // console.debug('handleUploadError() ====================');
      appEvents.triggerParent('user_notification', {
        title: 'Error Uploading File',
        text:  err.message
      });
      this.resetProgressBar();
    },

    enableDragAndDrop: function () {

      function ignoreEvent(e) {
        e.stopPropagation();
        e.preventDefault();
      }

      function dropEvent(e) {
        ignoreEvent(e);
        e = e.originalEvent;
        var files = e.dataTransfer.files;
        this.upload(files);
      }

      var el = $('body');
      el.on('dragenter', ignoreEvent);
      el.on('dragover', ignoreEvent);
      el.on('drop', dropEvent.bind(this));
    },

    getFileName: function (file) {
      // console.debug('getFileName() ====================');
      return new P(function (resolve, reject) {
        file.getAsString(function (str) {
          if (!str) {
            return reject(new Error('File has no name'));
          }
          return resolve(str);
        });
      });
    },

    handlePaste: function (evt) {
      // console.debug('handlePaste() ====================');
      var self = this;

      if (evt.originalEvent.clipboardData.items.length > 1) {
        var file = evt.originalEvent.clipboardData.items[1].getAsFile();
        if (file.type.indexOf('image/') < 0) {
          // console.debug('not an image() ====================');
          return;
        }
        // debugger;
        evt.preventDefault();
        P.all([
            this.getFileName(evt.originalEvent.clipboardData.items[0]),
            file // sync
          ])
          .then(function (values) {
            values[1].name = values[0];
            self.upload([values[1]]);
          })
          ['catch'](function (err) {
            self.handleUploadError(err);
          });
      }
    },

    upload: function (files) {
      // console.debug('upload() ====================');
      // console.debug(files);

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
        // console.debug('file:', file);
      }

      // console.debug(data);

      // FIXME: do we need to generate a signature? WC
      apiClient.priv.get('/generate-signature', {
          room_uri: context.troupe().get('uri'),
          room_id: context.getTroupeId(),
          type: type
        })
        .then(function (res) {
          // console.debug('res', res);
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

