define([
  'jquery',
  'utils/context',
  'marionette',
  'utils/appevents',
  'views/app/uiVars',
  'components/modal-region',
  'utils/scrollbar-detect',
  'cocktail',
  'views/keyboard-events-mixin',
  'transloadit'
], function($, context, Marionette, appEvents, uiVars, modalRegion, hasScrollBars, cocktail, KeyboardEventsMixin) {
  "use strict";

  var touchEvents = {
    // "click #menu-toggle-button":        "onMenuToggle",
    "keypress":                         "onKeyPress"
  };

  var mouseEvents = {
    "click .js-favourite-button":          "toggleFavourite"
  };

  $('.trpDisplayPicture').tooltip('destroy');

  var ChatLayout = Marionette.Layout.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
    alertpanel: false,
    files: false,
    originalRightMargin: "",
    regions: {
    },

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    keyboardEvents: {
      'backspace': 'onKeyBackspace',
      'quote': 'onKeyQuote'
    },

    initialize: function() {

      // new AvatarView({
      //   el: $('#profile-icon'),
      //   user: context.getUser(),
      //   showTooltip: false
      // }).render();

      // // tooltips for the app-template
      // $('#profile-icon, #home-icon').tooltip();

      this.dialogRegion = modalRegion;

      if (hasScrollBars()) {
        $(".primary-scroll").addClass("scroller");
        $(".js-chat-input-container").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }

      this.enableDragAndDrop();
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

    enableDragAndDrop: function() {
      var progressBar = $('#file-progress-bar');

      function ignoreEvent(e) {
        e.stopPropagation();
        e.preventDefault();
      }

      function start() {}

      function progress(bytesReceived, bytesExpected) {
        var percentage = (bytesReceived / bytesExpected * 100 + 20).toFixed(2) + '%';
        setTimeout(function(){ progressBar.css('width', percentage); }, 200);
      }

      function reset() {
        progressBar.hide(function() {
          progressBar.css('width', '0%');
        });
      }

      function error(assembly) {
        if (assembly) {
          appEvents.triggerParent('user_notification', {
            title: "Error uploading file",
            text:  assembly.message
          });
        }
        progressBar.hide(function() {
          progressBar.css('width', '0%');
        });
      }

      function dropEvent(e) {
        e.stopPropagation();
        e.preventDefault();

        progressBar.show();
        setTimeout(function(){ progressBar.css('width', '10%'); }, 50);
        setTimeout(function(){ progressBar.css('width', '20%'); }, 600);

        // Prepare formdata
        e = e.originalEvent;
        var files = e.dataTransfer.files;
        if (files.length === 0) {
          reset();
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
        $.ajax({
          type: 'GET',
          url: '/api/private/generate-signature',
          data: {
            room_uri: context.troupe().get('uri'),
            room_id: context.getTroupeId(),
            type: type
          },
          success: function(data) {
            formdata.append("signature", data.sig);

            var options = {
              wait: true,
              modal: false,
              autoSubmit: false,
              onStart: start,
              onProgress: progress,
              onSuccess: reset,
              onError: error,
              debug: false,
              formData: formdata
            };

            var form = $('#upload-form');
            form.find('input[name="params"]').attr('value', data.params);
            form.unbind('submit.transloadit');
            form.transloadit(options);
            form.submit();
          }
        });
      }

      var el = $('body');
      el.on('dragenter', ignoreEvent);
      el.on('dragover',  ignoreEvent);
      el.on('drop',      dropEvent);
    }
  });

  cocktail.mixin(ChatLayout, KeyboardEventsMixin);

  return ChatLayout;
});
