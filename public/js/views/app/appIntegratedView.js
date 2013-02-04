/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'views/app/uiVars',
  'fineuploader',
  "nanoScroller"
  ], function($, _, Backbone, uiVars, qq) {
  "use strict";

  return Backbone.View.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
    alertpanel: false,
    events: {
      "click #menu-toggle":               "onMenuToggle",
      "mouseenter #left-menu-hotspot":    "onLeftMenuHotspot",
      "mouseenter #content-frame":        "onMouseEnterContentFrame",
      "mouseenter #header-wrapper":       "onMouseEnterHeader",
      "click #people-header":             "onPeopleHeaderClick",
      "click #request-header":            "onRequestHeaderClick",

      "mouseenter #left-menu":            "onMouseEnterLeftMenu",
      "mouseenter #toolbar-frame":        "onMouseEnterToolbar",
      "mouseleave #toolbar-frame":        "onMouseLeaveToolbar",
      "mouseleave #header-wrapper":       "onMouseLeaveHeader",

      "click #file-header":               "onFileHeaderClick",
      "click #mail-header":               "onMailHeaderClick",
      "keyup":                            "onKeyUp"
    },

    initialize: function(options) {
      var self = this;
      this.app = options.app;


      $('body').append('<span id="fineUploader"></span>');

      $(".nano").nanoScroller({ preventPageScrolling: true });

      this.uploader = new qq.FineUploader({
        element: $('#fineUploader')[0],
        dragAndDrop: {
          extraDropzones: [$('body')[0]],
          hideDropzones: false,
          disableDefaultDropzone: false
        },
        text: {
          dragZone: '', // text to display
          dropProcessing: '',
          waitingForResponse: ''
        },
        request: {
          endpoint: '/troupes/' + window.troupeContext.troupe.id + '/downloads/'
        },
        callbacks: {
          onComplete: function(id, fileName, response) {
            if(response.success) {
              self.app.collections['files'].add(response.file, { merge: true });
              window.location.href = "#file/" + response.file.id;
            }
          }
        }
      });

      this.app.rightPanelRegion.on('show', function() {
        //console.log("SHOW PANEL");
        self.showPanel("#right-panel");
      });

      this.app.rightPanelRegion.on('close', function() {
        window.setTimeout(function() {
          if(!self.app.rightPanelRegion.currentView) {
            //console.log("CLOSE PANEL");
            self.hidePanel("#right-panel");
          }
        }, 100);
      });

      $(document).on('troupeUnreadTotalChange', function(event, value) {
        var badge = self.$el.find('#unread-badge');
        badge.text(value);
        if(value > 0) {
          badge.show();
        } else {
          badge.hide();
        }
      });

    },

    toggleRightPanel: function(id) {
      $('#'+id).slideToggle(350);
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
            width: '124px'
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

      $("#header-frame, #alert-content").animate({
        marginRight: '0px'
      }, 350, function() {
      });

      $("#content-frame").animate({
          right: '-=160px'
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

        $("#header-frame, #alert-content").animate({
          marginRight: uiVars.menuSlideValue
        }, 350, function() {
        });

        $("#content-frame").animate({
          right: '+=160px'
        }, 350, function() {
        });

        this.rightpanel = true;
      }
    },

    showMenu: function() {
      if (this.leftmenu) return;
      console.log("Showing the menu");
      // $("#left-menu-scroll").nanoScroller();

      // if there's not enough space to bring the left panel out, we need to shift things a bit to the right
      // this document.width is a hack to test something. MIKE: FIX IT!!!
      if (($(document).width() < 380) && (this.rightpanel)) {
        this.shifted = true;
        $('#right-panel').animate({ right: uiVars.shiftedPanelValue }, 350);

        $("#header-frame, #alert-content").animate({
          marginRight: uiVars.shiftedMarginValue,
          marginLeft: uiVars.menuSlideValue
        }, 350);

      } else {
        $("#header-frame, #alert-content").animate({
          marginLeft: uiVars.menuSlideValue
        }, 350);
        $("#content-frame").animate({
          right: '-=160px'
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

        $("#header-frame, #alert-content").animate({
          marginLeft: '0px',
          marginRight: uiVars.menuSlideValue
        }, 350);

      } else {

        $("#header-frame, #alert-content").animate({
          marginLeft: '0px'
        }, 350);

        $("#content-frame").animate({
          right: '+=160px'
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

    onMouseEnterHeader: function() {
      this.showProfileMenu();
    },

    onMouseLeaveHeader: function() {
      this.hideProfileMenu();
    },

    onMailHeaderClick: function() {
      this.toggleMails();
    },

    onFileHeaderClick: function() {
      this.toggleFiles();
    },

    onRequestHeaderClick: function() {
      this.toggleRightPanel('request-list');
    },

    onPeopleHeaderClick: function() {
      this.toggleRightPanel('people-list');
    },

    onAddPeopleClick: function() {
    },

    onMouseEnterLeftMenu: function() {
      $(".nano").nanoScroller({ preventPageScrolling: true });
    },

    onMouseEnterToolbar: function() {
      $(".nano").nanoScroller({ preventPageScrolling: true });
    },

    onMouseLeaveToolbar: function() {

    },

    onKeyUp: function(e) {
      // return if a form input has focus
      if ( $("*:focus").is("textarea, input") ) return true;

      // return in a modal is open
      if ( $("body").hasClass('modal-open') ) return true;

      // t shows Troupe menu
      if(e.keyCode == 84) {
        this.toggleMenu();
      }

      // esc returns to the mail view
      if(e.keyCode == 27) {
        console.log("Escape pushed in app");
        window.location.href = '#';
      }

    }

  });
});
