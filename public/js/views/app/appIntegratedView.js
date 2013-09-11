/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'views/base',
  'utils/context',
  'log!appIntegratedView',
  'utils/appevents',
  'marionette',
  'views/signup/usernameView',
  'views/profile/profileView',
  'views/app/uiVars',
  'components/webNotifications',
  'components/modal-region',
  'cocktail',
  'bootstrap_tooltip',  // no ref
  "nanoscroller"        // no ref
  ], function($, _, TroupeViews, context, log, appEvents, Marionette, UsernameView, ProfileView, uiVars,
    notifications, modalRegion, cocktail) {
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
    "mouseenter #header-wrapper":       "onMouseEnterHeader",
    "mouseenter #left-menu":            "onMouseEnterLeftMenu",
    "mouseenter #toolbar-frame":        "onMouseEnterToolbar",
    "mouseleave #toolbar-frame":        "onMouseLeaveToolbar",
    "mouseleave #header-wrapper":       "onMouseLeaveHeader",
    "keypress":                         "onKeyPress",
    "click #user-icon":                 "toggleMenu",
    "click #search-icon":               "toggleMenu",
    "click #troupe-icon":               "toggleMenu",
    "click #troupe-more-actions":       "toggleTroupeMenu"
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
      rightToolbarRegion: "#toolbar-frame",
      headerRegion: "#header-wrapper"
    },

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    initialize: function() {
      var self = this;

      // $('body').append('<span id="fineUploader"></span>');

      //$(".nano").nanoScroller({ preventPageScrolling: true });

      this.dialogRegion = modalRegion;
      this._leftMenuLockCount = 0;

      this.rightPanelRegion.on('show', function() {
        //log("SHOW PANEL");
        self.showPanel("#right-panel");
      });

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
      $("#chat-frame, #header-container, #chat-input, #toolbar-frame").removeClass('rightCollapse');
      $(whichPanel).removeClass('visible');
      this.rightpanel = false;
    },

    showPanel: function(whichPanel) {
      if (!this.rightpanel) {
        $("#header-container, #chat-frame, #chat-input, #toolbar-frame").addClass("rightCollapse");
        $(whichPanel).addClass("visible");
        this.rightpanel = true;
      }
    },

    showMenu: function() {
      if (this._menuAnimating) return;
      this.openLeftMenu();
    },

    hideMenu: function() {
      if(this._menuAnimating || this._leftMenuLockCount > 0) return;
      this.closeLeftMenu();
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
      $("#header-container, #chat-frame, #chat-input").addClass("leftCollapse");

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
      $("#header-container, #chat-frame, #chat-input").removeClass("leftCollapse");
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
      $("#troupe-actions").addClass("visible");
      this.files = true;
    },

    hideTroupeMenu: function() {
      // $("#file-list").css({"width": "0px", "padding-left" : "0"});
      $("#troupe-actions").removeClass("visible");
      this.files = false;
    },

    toggleTroupeMenu: function() {
      if (this.files) {
        this.hideTroupeMenu();
      }
      else {
        this.showTroupeMenu();
      }
    },

    toggleMenu: function() {
      if (this.leftmenu) {
        this.hideMenu();
      } else {
        this.showMenu();
      }
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
      $(".nano").nanoScroller({ preventPageScrolling: true });
    },

    onMouseEnterToolbar: function() {
      $(".nano").nanoScroller({ preventPageScrolling: true });
    },

    onMouseLeaveToolbar: function() {

    },

    activateSearchList: function () {

      $("#list-search-input").focus();
    },

    onKeyPress: function(e) {
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
    onMouseEnterHeader: function() {
      this.showProfileMenu();
    },

    onMouseLeaveHeader: function() {
      this.hideProfileMenu();
    },

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
