/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'utils/context',
  'utils/appevents',
  'marionette',
  'views/app/uiVars',
  'views/widgets/avatar',
  'components/modal-region',
  'cocktail',
  'utils/scrollbar-detect',
  'bootstrap_tooltip'  // no ref
  ], function($, TroupeViews, context, appEvents, Marionette, uiVars, AvatarView,
    modalRegion, cocktail, hasScrollBars) {
  "use strict";

  var touchEvents = {
    // "click #menu-toggle-button":        "onMenuToggle",
    "keypress":                         "onKeyPress"
  };

  var mouseEvents = {
    // "keypress":                         "onKeyPress",
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

      // $('body').append('<span id="fineUploader"></span>');

      //$(".nano").nanoScroller({ preventPageScrolling: true });

      this.dialogRegion = modalRegion;

      this.rightPanelRegion.on('show', function() {
        //log("SHOW PANEL");
        self.showPanel("#right-panel");
      });

      if (hasScrollBars()) {
        $(".trpChatContainer").addClass("scroller");
        $(".trpChatInputArea").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }

      // this.rightPanelRegion.on('close', function() {
      //   window.setTimeout(function() {
      //     if(!self.rightPanelRegion.currentView) {
      //       //log("CLOSE PANEL");
      //       self.hidePanel("#right-panel");
      //     }
      //   }, 100);
      // });

      // var profileCompleteTimeout = 60 * 1000;
      // setTimeout(function() {
      //   self.ensureSignupIsComplete();
      // }, profileCompleteTimeout);
    },

    // ensureSignupIsComplete: function() {
    //   var self = this, noteId = 'completeSignup';
    //   if (!context.isProfileComplete() || !context().user.username) {
    //     notifications.notify({
    //       id: noteId,
    //       content: "<a href='#'>Click here to complete the signup process</a>",
    //       timeout: Infinity,
    //       click: function() {
    //         notifications.notify({ id: noteId, action: 'hide' });
    //         self.ensureProfileIsComplete();
    //         self.ensureProfileIsUsernamed();
    //       }
    //     });
    //   }
    // },

    // ensureProfileIsComplete: function() {
    //   if (!context.isProfileComplete()) {
    //     new ProfileView.Modal().show();
    //   }
    // },

    // ensureProfileIsUsernamed: function() {
    //   var user = context.getUser();
    //   if (user && !user.username /* if the context has not yet loaded, what do we do? */) {
    //     new UsernameView.Modal().show();
    //   }
    // },

    // hidePanel: function (whichPanel) {
    //   $("#chat-frame, #chat-input, #toolbar-frame, #header-area").removeClass('rightCollapse');
    //   $(whichPanel).removeClass('visible');
    //   this.rightpanel = false;
    // },

    // showPanel: function(whichPanel) {
    //   if (!this.rightpanel) {
    //     $("#chat-frame, #chat-input, #toolbar-frame, #header-area").addClass("rightCollapse");
    //     $(whichPanel).addClass("visible");
    //     this.rightpanel = true;
    //   }
    // },

    // togglePanel: function(whichPanel) {
    //   if (this.rightpanel) {
    //     this.hidePanel(whichPanel);
    //   } else {
    //     this.showPanel(whichPanel);
    //   }
    // },

    toggleFavourite: function() {
      var favHeader = $('.trpTroupeFavourite');
      favHeader.toggleClass('favourited');
      var isFavourite = favHeader.hasClass('favourited');

      $.ajax({
        url: '/api/v1/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });
    },

    // /* Header */
    // showProfileMenu: function() {
    //   if (!this.profilemenu) {

    //     // $(".trpProfileMenu").animate({
    //     //     width: '132px'
    //     // }, 250, function () {

    //     // });

    //     $(".trpProfileMenu").fadeIn('fast');
    //     this.profilemenu = true;
    //   }
    // },

    // hideProfileMenu: function() {
    //   if (this.profilemenu) {
    //     $(".trpProfileMenu").fadeOut('fast');
    //     // $(".trpProfileMenu").animate({
    //     //     width: '0px'
    //     // }, 250);
    //     this.profilemenu = false;
    //   }
    // }
  });
  //cocktail.mixin(ChatLayout, TroupeViews.DelayedShowLayoutMixin);

  return ChatLayout;
});
