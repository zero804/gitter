/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'views/base',
  'utils/context',
  'log!appIntegratedView',
  'marionette',
  'views/signup/usernameView',
  'views/profile/profileView',
  'views/app/uiVars',
  'components/webNotifications',
  'components/modal-region',
  'bootstrap_tooltip',  // no ref
  "nanoscroller"        // no ref
  ], function($, _, TroupeViews, context, log, Marionette, UsernameView, ProfileView, uiVars, notifications, modalRegion) {
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

    "keypress":                         "onKeyPress"
  };

  $('.trpDisplayPicture').tooltip('destroy');

  var AppIntegratedLayout = Marionette.Layout.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
    alertpanel: false,

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

      $(whichPanel).animate({
        right: uiVars.hidePanelValue
      }, 350, function() {
        $(whichPanel).hide();
      });

      if ($(document).width() < 1250) {
        $("#header-frame, #alert-content, #chat-input").animate({
          left: '+=100px'
        }, 350, function() {
        });
      }

      $("#content-frame").animate({
            paddingRight: '-=100px'
          }, 350, function() {
          });

      this.rightpanel = false;
    },

    showPanel: function(whichPanel) {
      if (!this.rightpanel) {
        $(whichPanel).show();
        $(whichPanel).animate({
          right: '0px'
        }, 350, function() {
      // $("#left-menu").show();
        });

        if ($(document).width() < 1250) {

          $("#header-frame, #alert-content, #chat-input").animate({
            left: '-=100px'
          }, 350, function() {
          });

          $("#content-frame").animate({
            paddingRight: '+=100px'
          }, 350, function() {
          });
        }

        this.rightpanel = true;
      }
    },

    showMenu: function() {
      log("*********** Showing left menu");
      if (this.leftmenu) return;


      if (!window._troupeIsTablet) $("#chat-input-textarea").blur();

      if (this.selectedListIcon == "icon-search") {
        this.activateSearchList();
      }

      if ($(window).width() < 1250) {

        $("#menu-toggle-button, #left-menu-hotspot, #left-menu").animate({
          left: "+=280px"
        }, 350);


        $("#content-frame, #alert-content, #header-frame, #chat-input").animate({
          left: "+=280px"
        }, 350);

        $("#right-panel").animate({
          right: "-=280px"
        }, 350);
      }

      else {
        $("#menu-toggle-button, #left-menu-hotspot, #left-menu").animate({
          left: "+=280px"
        }, 350);


        $("#content-frame, #alert-content, #header-frame, #chat-input").animate({
          left: "+=180px"
        }, 350);

        $("#right-panel").animate({
          right: "-=280px"
        }, 350);
      }


      $("left-menu-hotspot").hide();
      this.leftmenu = true;
    },

    hideMenu: function() {

      if (!this.leftmenu) return;

      // refocus chat input in case it's lost focus but don't do that on tablets
      if (!window._troupeIsTablet) $("#chat-input-textarea").focus();


      if ($(window).width() < 1250) {
        $("#menu-toggle-button, #left-menu-hotspot, #left-menu").animate({
          left: "-=280px"
        }, 350);


        $("#content-frame, #alert-content, #header-frame, #chat-input").animate({
          left: "-=280px"
        }, 350);

        $("#right-panel").animate({
          right: "+=280px"
        }, 350);
      }

      else {
        $("#menu-toggle-button, #left-menu-hotspot, #left-menu").animate({
          left: "-=280px"
        }, 350);


        $("#content-frame, #alert-content, #header-frame, #chat-input").animate({
          left: "-=180px"
        }, 350);

        $("#right-panel").animate({
          right: "+=280px"
        }, 350);
      }

      $("left-menu-hotspot").hide();
      this.leftmenu = false;
    },

    togglePanel: function(whichPanel) {
      if (this.rightpanel) {
        this.hidePanel(whichPanel);
      } else {
        this.showPanel(whichPanel);
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
    }

  });

  _.extend(AppIntegratedLayout.prototype, TroupeViews.DelayedShowLayoutMixin);

  return AppIntegratedLayout;
});
