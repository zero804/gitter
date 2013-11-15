/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'utils/context',
  'utils/appevents',
  'marionette',
  'views/signup/usernameView',
  'views/profile/profileView',
  'views/app/uiVars',
  'views/widgets/avatar',
  'components/webNotifications',
  'components/modal-region',
  'components/titlebar',
  'cocktail',
  'utils/scrollbar-detect',
  'bootstrap_tooltip'  // no ref
  ], function($, TroupeViews, context, appEvents, Marionette, UsernameView, ProfileView, uiVars, AvatarView,
    notifications, modalRegion, TitlebarUpdater, cocktail, hasScrollBars) {
  "use strict";

  var touchEvents = {
    "click #menu-toggle-button":        "onMenuToggle",
    "keypress":                         "onKeyPress"
  };

  var mouseEvents = {
    "click #menu-toggle-button":        "onMenuToggle",
    "mouseenter #left-menu-hotspot":    "onLeftMenuHotspot",
    "mouseenter #menu-toggle":          "onLeftMenuHotspot",
    "mouseenter #content-frame":        "onMouseEnterContentFrame",
    "mouseenter #left-menu":            "onMouseEnterLeftMenu",
    "mouseenter #toolbar-frame":        "onMouseEnterToolbar",
    "mouseleave #toolbar-frame":        "onMouseLeaveToolbar",
    "keypress":                         "onKeyPress",
    "click #left-menu-icon":            "toggleMenu",
    "click #search-icon":               "toggleMenu",
    "click #troupe-icon":               "toggleMenu",
    "click #troupe-more-actions":       "toggleTroupeMenu",
    "click #favourite-button":          "toggleFavourite"
  };

  $('.trpDisplayPicture').tooltip('destroy');

  var AppIntegratedLayout = Marionette.Layout.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
    alertpanel: false,
    files: false,
    originalRightMargin: "",
    regions: {
      leftMenuRegion: "#left-menu",
      rightPanelRegion: "#right-panel",
      rightToolbarRegion: "#toolbar-frame"
    },

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    initialize: function() {
      var self = this;

      // Setup the title bar updater
      new TitlebarUpdater();

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
      this._leftMenuLockCount = 0;

      this.rightPanelRegion.on('show', function() {
        //log("SHOW PANEL");
        self.showPanel("#right-panel");
      });

      if (hasScrollBars()) {
        $(".trpChatContainer").addClass("scroller");
        $(".trpChatInputArea").addClass("scrollpush");
      }

      this.rightPanelRegion.on('close', function() {
        window.setTimeout(function() {
          if(!self.rightPanelRegion.currentView) {
            //log("CLOSE PANEL");
            self.hidePanel("#right-panel");
          }
        }, 100);
      });

      var profileCompleteTimeout = 60 * 1000;
      setTimeout(function() {
        self.ensureSignupIsComplete();
      }, profileCompleteTimeout);
    },

    ensureSignupIsComplete: function() {
      var self = this, noteId = 'completeSignup';
      if (!context.isProfileComplete() || !context().user.username) {
        notifications.notify({
          id: noteId,
          content: "<a href='#'>Click here to complete the signup process</a>",
          timeout: Infinity,
          click: function() {
            notifications.notify({ id: noteId, action: 'hide' });
            self.ensureProfileIsComplete();
            self.ensureProfileIsUsernamed();
          }
        });
      }
    },

    ensureProfileIsComplete: function() {
      if (!context.isProfileComplete()) {
        new ProfileView.Modal().show();
      }
    },

    ensureProfileIsUsernamed: function() {
      var user = context.getUser();
      if (user && !user.username /* if the context has not yet loaded, what do we do? */) {
        new UsernameView.Modal().show();
      }
    },

    hidePanel: function (whichPanel) {
      $("#chat-frame, #chat-input, #toolbar-frame").removeClass('rightCollapse');
      $(whichPanel).removeClass('visible');
      this.rightpanel = false;
    },

    showPanel: function(whichPanel) {
      if (!this.rightpanel) {
        $("#chat-frame, #chat-input, #toolbar-frame").addClass("rightCollapse");
        $(whichPanel).addClass("visible");
        this.rightpanel = true;
      }
    },

    showMenu: function() {
      if (this._menuAnimating) return;
      this.openLeftMenu();
      $("#left-menu-icon").addClass("active");
    },

    hideMenu: function() {
      if(this._menuAnimating || this._leftMenuLockCount > 0) return;
      this.closeLeftMenu();
      $("#left-menu-icon").removeClass("active");
    },

    openLeftMenu: function() {
      if (this.leftmenu) return;

      if (!window._troupeIsTablet) $("#chat-input-textarea").blur();

      if (this.selectedListIcon == "icon-search") {
        this.activateSearchList();
      }

      var self = this;
      this._menuAnimating = true;

      appEvents.trigger('leftMenu:animationStarting');
      setTimeout(function() {
        self._menuAnimating = false;
        appEvents.trigger('leftMenu:showing');
        appEvents.trigger('leftMenu:animationComplete');
      }, 350);

      $("#left-menu").addClass("visible");
      $("#mini-left-menu, #mini-left-menu-container").addClass("active");
      $("#content-wrapper, #toolbar-frame, #menu-toggle-button, #chat-input-wrapper").addClass("leftCollapse");

      this.leftmenu = true;
    },

    closeLeftMenu: function() {
      if(!this.leftmenu) return;
      this._leftMenuLockCount = 0;

      // refocus chat input in case it's lost focus but don't do that on tablets
      if (!window._troupeIsTablet) $("#chat-input-textarea").focus();

      var self = this;
      this._menuAnimating = true;

      appEvents.trigger('leftMenu:animationStarting');
      setTimeout(function() {
        self._menuAnimating = false;
        appEvents.trigger('leftMenu:hidden');
        appEvents.trigger('leftMenu:animationComplete');
      }, 350);

      $("#mini-left-menu, #mini-left-menu-container").removeClass("active");
      $("#content-wrapper, #toolbar-frame, #menu-toggle-button, #chat-input-wrapper").removeClass("leftCollapse");
      $("#left-menu").removeClass("visible");

      this.leftmenu = false;
    },


    togglePanel: function(whichPanel) {
      if (this.rightpanel) {
        this.hidePanel(whichPanel);
      } else {
        this.showPanel(whichPanel);
      }
    },

    showTroupeMenu: function() {
      // $("#file-list").css({"width" : "200px" , "padding-left" : "20px"});
      $("#troupe-content").addClass("visible");
      this.files = true;
    },

    hideTroupeMenu: function() {
      // $("#file-list").css({"width": "0px", "padding-left" : "0"});
      $("#troupe-content").removeClass("visible");
      this.files = false;
    },

    toggleTroupeMenu: function() {
      if (this.files) {
        this.hideTroupeMenu();
        $("#right-menu-icon").removeClass("active");
      }
      else {
        this.showTroupeMenu();
        $("#right-menu-icon").addClass("active");
      }
    },

    toggleMenu: function() {
      if (this.leftmenu) {
        this.hideMenu();
      } else {
        this.showMenu();
      }
    },

    toggleFavourite: function() {
      var favHeader = $('.trpTroupeFavourite');
      favHeader.toggleClass('favourited');
      var isFavourite = favHeader.hasClass('favourited');

      $.ajax({
        url: '/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });
    },

    toggleAlert: function() {
      if (this.alertpanel) {
        this.alertpanel = false;
        $("#content-frame, #menu-toggle-button, #left-menu, #right-panel").animate({
          marginTop: '0px'
        }, 350);
      }

      else {
        this.alertpanel = true;
         $("#content-frame, #menu-toggle-button, #left-menu, #right-panel").animate({
          marginTop: '120px'
        }, 350);
      }
      $("#alert-panel").slideToggle(350);
    },

    onMenuToggle: function() {
      this.toggleMenu();
    },

    onLeftMenuHotspot: function() {
      this.showMenu();
    },

    onMouseEnterContentFrame: function() {
      if (this.leftmenu) {
        this.hideMenu();
      }
    },

    onMouseEnterLeftMenu: function() {

    },

    onMouseEnterToolbar: function() {

    },

    onMouseLeaveToolbar: function() {

    },

    activateSearchList: function () {

      $("#list-search-input").focus();
    },

    onKeyPress: function(e) {
      //  return if user is copying or pasting
      if ( e.metaKey || e.ctrlKey ) return true;

      // return if a form input has focus
      if ( $("*:focus").is("textarea, input") ) return true;

      // return in a modal is open
      if ( $("body").hasClass('modal-open') ) return true;

      // unless the left menu is open,
      if (!this.leftmenu) {
        // put focus on the chat input box
        $("#chat-input-textarea").focus();
        // the first key press will propogate to the input box
        return true;
      }
      // if the left menu is open,
      else {
        // show and focus the search box
        $(window).trigger('showSearch');
        // the first key press should be propogated if the box is displayed before focussed
        return true;
      }

      // t shows Troupe menu
      // if(e.keyCode == 84) {
      //   this.toggleMenu();
      // }

      // esc returns to the mail view
      if(e.keyCode == 27) {
        window.location.href = '#';
      }

      // esc returns to the mail view
    },

    /* Header */
    showProfileMenu: function() {
      if (!this.profilemenu) {

        // $(".trpProfileMenu").animate({
        //     width: '132px'
        // }, 250, function () {

        // });

        $(".trpProfileMenu").fadeIn('fast');
        this.profilemenu = true;
      }
    },

    hideProfileMenu: function() {
      if (this.profilemenu) {
        $(".trpProfileMenu").fadeOut('fast');
        // $(".trpProfileMenu").animate({
        //     width: '0px'
        // }, 250);
        this.profilemenu = false;
      }
    },

    lockLeftMenuOpen: function() {
      this._leftMenuLockCount++;
    },

    unlockLeftMenuOpen: function() {
      this._leftMenuLockCount--;
    }


  });
  cocktail.mixin(AppIntegratedLayout, TroupeViews.DelayedShowLayoutMixin);

  return AppIntegratedLayout;
});
