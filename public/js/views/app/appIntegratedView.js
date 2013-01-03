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
    events: {
      "click #menu-toggle":             "onMenuToggle",
      "mouseenter #left-menu-hotspot":  "onLeftMenuHotspot",
      "mouseenter #chat-frame":         "onMouseEnterChatFrame"
    },

    initialize: function() {
      var self = this;
      vent.on("detailView:show", function() {
        self.showPanel("#right-panel");
      });
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

      $("#header-frame").animate({
        marginRight: '0px'
      }, 350, function() {
      });

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
      console.log("hotspot activated");
      this.showMenu();
    },

    onMouseEnterChatFrame: function() {
      console.log("mouse left the menu");
      this.hideMenu();
    }
  });
});
