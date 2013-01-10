// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'utils/vent'
  ], function($, _, Backbone, vent) {
  /*jslint browser: true*/
  /*global require console */
  "use strict";

  return Backbone.View.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    events: {
    "click #menu-toggle":               "onMenuToggle",
      "mouseenter #left-menu-hotspot":    "onLeftMenuHotspot",
      "mouseenter #chat-frame":           "onMouseEnterChatFrame",
      "mouseenter #header-wrapper":       "onMouseEnterHeader",
      "mouseenter #content-frame":        "onMouseEnterContent",
      "click #file-header":               "onFileHeaderClick",
      "click #mail-header":               "onMailHeaderClick"
    },

    initialize: function(options) {
      var self = this;
      this.app = options.app;

      this.app.rightPanelRegion.on('show', function() {
        console.log("SHOW PANEL");
        self.showPanel("#right-panel");
      });

      this.app.rightPanelRegion.on('close', function() {
        window.setTimeout(function() {
          if(!self.app.rightPanelRegion.currentView) {
            console.log("CLOSE PANEL");
            self.hidePanel("#right-panel");
          }
        }, 100);
      });
    },

    toggleFiles: function () {
      $("#file-list").slideToggle(350);
    },

    toggleMails: function () {
      $("#mail-list").slideToggle(350);
    },

    showProfileMenu: function() {
      if (!this.profilemenu) {

        $(".trpProfileMenu").animate({
            width: '120px'
        }, 250);
        this.profilemenu = true;
      }
    },


    hideProfileMenu: function() {
      if (this.profilemenu) {
        $(".trpProfileMenu").animate({
            width: '0px'
        }, 250);
        this.profilemenu = false;
      }
    },

    hidePanel: function (whichPanel) {

      $(whichPanel).animate({
        right: '-280px'
      }, 350, function() {
        $(whichPanel).hide();
      });

      $("#content-frame").animate({
        marginRight: '0px'
      }, 350, function() {
      });

      $("#header-frame").animate({
        marginRight: '0px'
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

        $("#content-frame").animate({
          marginRight: '280px'
        }, 350, function() {
        });

        $("#header-frame").animate({
          marginRight: '280px'
        }, 350, function() {
        });

        this.rightpanel = true;
      }
    },

    showMenu: function() {
      if (this.leftmenu) return;

      $("#left-menu").animate({
        left: '0px'
      }, 350, function() {
        // $("#left-menu").show();
      });

      $("#menu-toggle-button").animate({
        left: '280px'
      }, 350, function() {
      });

      $("#content-frame").animate({
        marginLeft: '280px'
      }, 350);

      $("#header-frame").animate({
        marginLeft: '280px'
      }, 350);

      $("left-menu-hotspot").hide();
      this.leftmenu = true;
    },

    hideMenu: function() {
      $("#left-menu").animate({
        left: '-280px'
      }, 350, function() {
        $("left-menu-hotspot").show();
      });

      $("#menu-toggle-button").animate({
        left: '0px'
      }, 350, function() {

      });

      $("#content-frame").animate({
        marginLeft: '0px'
      }, 350, function() {
      });

      $("#header-frame").animate({
        marginLeft: '0px'
      }, 350, function() {
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

    onMenuToggle: function() {
      this.toggleMenu();
    },

    onLeftMenuHotspot: function() {
      this.showMenu();
    },

    onMouseEnterChatFrame: function() {
      this.hideMenu();
    },

    onMouseEnterHeader: function() {
      this.showProfileMenu();
    },

    onMouseEnterContent: function() {
      this.hideProfileMenu();
    },

    onMouseLeaveHeader: function() {
      this.hideProfileMenu();
    },

    onMailHeaderClick: function() {
        this.toggleMails();
    },

    onFileHeaderClick: function() {
        this.toggleFiles();
    }

  });
});
