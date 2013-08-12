/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'log!appIntegratedView',
  'marionette',
  'views/signup/usernameView',
  'views/app/uiVars',
  'bootstrap_tooltip',  // no ref
  "nanoscroller"        // no ref
  ], function($, context, log, Marionette, UsernameView, uiVars) {
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
    "click #search-icon":                 "toggleMenu",
    "click #troupe-icon":                 "toggleMenu"
  };

  $('.trpDisplayPicture').tooltip('destroy');

  return Marionette.Layout.extend({
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

      /* This is a special region which acts like a region, but is implemented completely differently */
      this.dialogRegion = {
        currentView: null,
        show: function(view) {
          if(this.currentView) {
            this.currentView.fade = false;
            this.currentView.hideInternal();
          }
          this.currentView = view;
          view.navigable = true;
          view.show();
        },
        close: function() {
          if(this.currentView) {
            this.currentView.navigationalHide();
            this.currentView = null;
          }
        }
      };

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



      this.ensureProfileIsUsernamed();
    },

    ensureProfileIsUsernamed: function() {
      var user = window.troupeContext.user;
      if (!user.username) {
        (new UsernameView.Modal()).show();
      }
    },

    hidePanel: function (whichPanel) {

      $("#toolbar-frame, #content-frame, #header-wrapper, #chat-input-wrapper").css({"right" : "0px"});

      $(whichPanel).css({
        "right": '-260px'
      });

      this.rightpanel = false;
    },

    showPanel: function(whichPanel) {
      if (!this.rightpanel) {


        $("#toolbar-frame, #content-frame, #header-wrapper, #chat-input-wrapper").css({"right" :"260px"});

        $(whichPanel).css({
          "right": '0px'
        }, 350);
        $(whichPanel).show();

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

      $("#left-menu").css({
        "width": "280px"
      });

      $("#content-frame, #header-wrapper, #chat-input-wrapper").css({"left" : "280px"});

      this.leftmenu = true;
    },

    hideMenu: function() {
      log("------  hiding left menu ------")
      if (!this.leftmenu) return;

      // refocus chat input in case it's lost focus but don't do that on tablets
      if (!window._troupeIsTablet) $("#chat-input-textarea").focus();

      $("#content-frame, #header-wrapper, #chat-input-wrapper").css({"left" : "0px"});

      $("#left-menu").css({
        "width": "0px"
      });

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
});
