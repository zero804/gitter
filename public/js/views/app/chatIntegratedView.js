/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'utils/appevents',
  'views/app/uiVars',
  'views/widgets/avatar',
  'components/modal-region',
  'utils/scrollbar-detect'
], function($, context, Marionette, appEvents, uiVars, AvatarView, modalRegion, hasScrollBars) {
  "use strict";

  var touchEvents = {
    // "click #menu-toggle-button":        "onMenuToggle",
    "keypress":                         "onKeyPress"
  };

  var mouseEvents = {
    // "keypress":                         "onKeyPress",
    "keyup": "onKeyUp",
    "click #favourite-button":          "toggleFavourite"
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
      rightPanelRegion: "#right-panel",
      rightToolbarRegion: "#toolbar-frame"
    },

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    initialize: function() {
      var self = this;

      new AvatarView({
        el: $('#profile-icon'),
        user: context.getUser(),
        showTooltip: false
      }).render();

      // tooltips for the app-template
      $('#profile-icon, #home-icon').tooltip();

      this.dialogRegion = modalRegion;

      this.rightPanelRegion.on('show', function() {
        self.showPanel("#right-panel");
      });

      if (hasScrollBars()) {
        $(".trpChatContainer").addClass("scroller");
        $(".trpChatInputArea").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }
    },

    toggleFavourite: function() {
      var favHeader = $('.trpTroupeFavourite');
      favHeader.toggleClass('favourited');
      var isFavourite = favHeader.hasClass('favourited');

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });
    },


    onKeyUp: function(e) {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if((e.keyCode === 82) || (e.keyCode ===81) && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        this.quoteText();
      }
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
    }
  });

  return ChatLayout;
});
