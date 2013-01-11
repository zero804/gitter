// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'utils/vent',
  'views/app/uiVars',
  'fineuploader'
  ], function($, _, Backbone, vent, uiVars, qq) {
  /*jslint browser: true*/
  /*global require console */
  "use strict";

  return Backbone.View.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
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

      var uploader = new qq.FineUploader({
        element: document.getElementById("file-upload-button"),
        dragAndDrop: {
          extraDropzones: [document.body],
          hideDropzones: false,
          disableDefaultDropzone: false
        },
        request: {
          endpoint: '/troupes/' + window.troupeContext.troupe.id + '/downloads/'
        },
        debug: true
      });

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
        right: uiVars.hidePanelValue
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
          marginRight: uiVars.menuSlideValue
        }, 350, function() {
        });

        $("#header-frame").animate({
          marginRight: uiVars.menuSlideValue
        }, 350, function() {
        });

        this.rightpanel = true;
      }
    },

    showMenu: function() {
      if (this.leftmenu) return;

      console.log("Test: " + uiVars.blahName);

      // if there's not enough space to bring the left panel out, we need to shift things a bit to the right
      if (($(document).width() < 1380) && (this.rightpanel)) {
        this.shifted = true;
        $('#right-panel').animate({ right: uiVars.shiftedPanelValue }, 350);
        
        $("#content-frame").animate({
          marginRight: uiVars.shiftedMarginValue,
          marginLeft: uiVars.menuSlideValue
        }, 350);

        $("#header-frame").animate({
          marginRight: uiVars.shiftedMarginValue,
          marginLeft: uiVars.menuSlideValue
        }, 350);

      } else {
        $("#content-frame").animate({
          marginLeft: uiVars.menuSlideValue
        }, 350);

        $("#header-frame").animate({
          marginLeft: uiVars.menuSlideValue
        }, 350);
      }

      $("#left-menu").animate({
        left: '0px'
      }, 350);

      $("#menu-toggle-button").animate({
        left: uiVars.panelWidthValue
      }, 350);

      $("left-menu-hotspot").hide();
      this.leftmenu = true;
    },

    hideMenu: function() {

      // if the right panel has been shifted, we need to behave a little differently when hiding the menu
      if (this.shifted) {
        this.shifted = false;
        $('#right-panel').animate({ right: 0 }, 350);

        $("#content-frame").animate({
          marginLeft: '0px',
          marginRight: uiVars.menuSlideValue
        }, 350);

        $("#header-frame").animate({
          marginLeft: '0px',
          marginRight: uiVars.menuSlideValue
        }, 350);

      } else {

        $("#content-frame").animate({
          marginLeft: '0px'
        }, 350);

        $("#header-frame").animate({
          marginLeft: '0px'
        }, 350);

      }

      $("#left-menu").animate({
        left: uiVars.hidePanelValue
      }, 350, function() {
        $("left-menu-hotspot").show();
      });

      $("#menu-toggle-button").animate({
        left: '0px'
      }, 350);



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
