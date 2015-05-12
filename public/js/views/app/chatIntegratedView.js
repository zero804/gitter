"use strict";
var $ = require('jquery');
var _ = require('underscore');

var context = require('utils/context');
var Marionette = require('backbone.marionette');
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
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var embedDecorator = require('views/chat/decorators/embedDecorator');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var UnreadBannerView = require('views/app/unreadBannerView');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');
var unreadBannerModel = require('./unreadBannerModel');
require('views/behaviors/isomorphic');

require('transloadit');

var PROGRESS_THRESHOLD = 62.5;

function contains(domStringsList, item) {
  if (!domStringsList) return false;
  for (var i = 0; i < domStringsList.length; i++) {
    if (domStringsList[i] === item) return true;
  }
  return false;
}

module.exports = (function() {

  var touchEvents = {
    "keypress":                         "onKeyPress",
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  };

  var standardEvents = {
    "click .js-favourite-button": "toggleFavourite",
    'paste': 'handlePaste',
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom'),

    /* Drag drop events */
    'dragenter': 'onDragEnter',
    'dragleave': 'onDragLeave',
    'dragover': 'onDragOver',
    'drop': 'onDrop'
  };

  function ignoreEvent(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  var ChatLayout = Marionette.LayoutView.extend({
    template: false,
    el: 'body',

    behaviors: {
      Isomorphic: {}
    },

    ui: {
      scrollToBottom: '.js-scroll-to-bottom',
      progressBar: '#file-progress-bar',
      dragOverlay: '.js-drag-overlay'
    },

    events: uiVars.isMobile ? touchEvents : standardEvents,

    keyboardEvents: {
      'backspace': 'onKeyBackspace',
      'quote': 'onKeyQuote'
    },

    /**
     * IMPORTANT: when dragging moving over child nodes will cause dragenter and dragleave, so we need to keep this count, if it's zero means that we should hide the overlay. WC.
     */
    dragCount: 0,

    regions: {
      toolbar: "#right-toolbar-layout",
      chat: '#chat-container',
      input: '#chat-input',
      bannerTop: '#unread-banner',
      bannerBottom: '#bottom-unread-banner'
    },

    initialize: function() {
      // Setup the ChatView - this is instantiated once for the application, and shared between many views
      this.listenTo(itemCollections.chats, 'atBottomChanged', function(isBottom) {
        this.ui.scrollToBottom.toggleClass('u-scale-zero', isBottom);
      });

      // this.chatCollectionView = chatCollectionView;
      this.dialogRegion = modalRegion;
    },

    initRegions: function(optionsForRegion) {
      /* TODO: Give this stuff a proper home */
      if (hasScrollBars()) {
        $(".primary-scroll").addClass("scroller");
        $(".js-chat-input-container").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }

      var chatCollectionView = new ChatCollectionView(optionsForRegion('chat', {
        collection: itemCollections.chats,
        decorators: [issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
      }));

      var inputRegion = new chatInputView.ChatInputView(optionsForRegion('input', {
        collection: itemCollections.chats,
        chatCollectionView: chatCollectionView,
        rollers: chatCollectionView.rollers
      }));

      return {
        chat: chatCollectionView,
        input: inputRegion,
        toolbar: new RightToolbarView(optionsForRegion('toolbar')),
        bannerTop: new UnreadBannerView.Top({
          model: unreadBannerModel,
          chatCollectionView: this.chatCollectionView
        }),
        bannerBottom: new UnreadBannerView.Bottom({
          model: unreadBannerModel,
          chatCollectionView: this.chatCollectionView
        })
      };
    },

    onKeyBackspace: function(e) {
      e.stopPropagation();
      e.preventDefault();
    },

    onKeyQuote: function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.quoteText();
    },

    getSelectionText: function() {
      var text = "";
      if (window.getSelection) {
        text = window.getSelection().toString();
      } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
      }
      return text;
    },

    quoteText: function() {
      var selectedText = this.getSelectionText();
      if (selectedText.length > 0) {
        appEvents.trigger('input.append', "> " + selectedText, { newLine: true });
      }
    },

    updateProgressBar: function(spec) {
      var bar = this.ui.progressBar;
      var value = spec.value && spec.value.toFixed(0) + '%';
      var timeout = spec.timeout || 200;
      setTimeout(function() { bar.css('width', value); }, timeout);
    },

    resetProgressBar: function() {
      this.ui.progressBar.hide();
      this.updateProgressBar({
        value: 0,
        timeout: 0
      });
    },

    handleUploadProgress: function(done, expected) {
      this.updateProgressBar({ value: PROGRESS_THRESHOLD + (done/expected) * (100 - PROGRESS_THRESHOLD), timeout: 0 });
    },

    handleUploadStart: function() {
      this.ui.progressBar.show();
    },

    handleUploadSuccess: function(res) {
      this.resetProgressBar();
      var n = parseInt(res.fields.numberOfFiles, 10);
      appEvents.triggerParent('user_notification', {
        title: 'Upload complete',
        text: (n > 1 ? n + ' files' : 'file') + ' uploaded successfully.'
      });
    },

    handleUploadError: function(err) {
      appEvents.triggerParent('user_notification', {
        title: 'Error Uploading File',
        text:  err.message
      });
      this.resetProgressBar();
    },

    isTextDrag: function(e) {
      var dt = e.dataTransfer;
      if (contains(dt.types, 'Files')) return false;
      if (!dt.files && dt.files.length > 0) {
        return false;
      }

      var items = dt.items;
      if (!items) return true;
      for (var i = 0; i < items.length; i++) {
        var kind = items[i].kind;
        if (kind !== 'string') {
          return false;
        }
      }

      return true;
    },

    onDragEnter: function(e) {
      if (e.originalEvent) e = e.originalEvent;
      if (this.isTextDrag(e)) return;
      this.dragCounter++;
      this.ui.dragOverlay.toggleClass('hide', false);
      ignoreEvent(e);
    },

    onDragLeave: function(e) {
      if (e.originalEvent) e = e.originalEvent;
      if (this.isTextDrag(e)) return;

      this.dragCounter--;
      this.ui.dragOverlay.toggleClass('hide', this.dragCounter === 0);
      ignoreEvent(e);
    },

    onDragOver: function(e) {
      if (e.originalEvent) e = e.originalEvent;
      if (this.isTextDrag(e)) return;
      ignoreEvent(e);
    },

    onDrop: function(e) {
      if (e.originalEvent) e = e.originalEvent;
      if (this.isTextDrag(e)) return;

      this.dragCounter = 0; // reset the counter
      this.ui.dragOverlay.toggleClass('hide', true);
      ignoreEvent(e);

      var files = e.dataTransfer.files;
      this.upload(files);
    },

    isImage: function(blob) {
      return /image\//.test(blob.type);
    },

    /**
     * handles pasting, image-only for now
     */
    handlePaste: function(evt) {
      evt = evt.originalEvent || evt;
      var clipboard = evt.clipboardData;
      var blob = null;

      if (!clipboard || !clipboard.items) {
        return; // Safari + FF, don't support pasting images in. Ignore and perform default behaviour. WC.
      }

      if (clipboard.items.length === 1) {
        blob = clipboard.items[0].getAsFile();
        if (!blob || !this.isImage(blob)) {
          return;
        } else {
          evt.preventDefault();
          this.upload([blob]);
        }
      }
    },

    upload: function(files) {
      if (!files.length) return;

      this.ui.progressBar.show();

      this.updateProgressBar({
        value: 0,
        timeout: 0
      });

      this.updateProgressBar({
        value: PROGRESS_THRESHOLD,
        timeout: 200
      });

      var DEFAULT_OPTIONS = {
        wait: true,
        modal: false,
        autoSubmit: false,
        debug: false,
        onStart: this.handleUploadStart.bind(this),
        onProgress: this.handleUploadProgress.bind(this),
        onSuccess: this.handleUploadSuccess.bind(this),
        onError: this.handleUploadError.bind(this)
      };

      var formData = new FormData();
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

        formData.append('file', file);
      }

      formData.append('numberOfFiles', files.length);
      apiClient.priv.get('/generate-signature', {
          room_uri: context.troupe().get('oneToOne') ? context.user().get('username') : context.troupe().get('uri'),
          room_id: context.getTroupeId(),
          type: type
        })
        .then(function(res) {
          formData.append("signature", res.sig);

          var form = $('#upload-form');
          form.find('input[name="params"]').attr('value', res.params);
          form.unbind('submit.transloadit');
          form.transloadit(_.extend(DEFAULT_OPTIONS, { formData: formData }));
          form.submit();
        });
    }
  });

  cocktail.mixin(ChatLayout, KeyboardEventsMixin);

  return ChatLayout;

})();
