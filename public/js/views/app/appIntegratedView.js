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
    selectedListIcon: "icon-troupes",
    events: {
      "click #menu-toggle":               "onMenuToggle",
      "mouseenter #left-menu-hotspot":    "onLeftMenuHotspot",
      "mouseenter #menu-toggle":          "onLeftMenuHotspot",
      "mouseenter #content-frame":        "onMouseEnterContentFrame",
      "mouseenter #header-wrapper":       "onMouseEnterHeader",
      "click #people-header":             "onPeopleHeaderClick",
      "click #request-header":            "onRequestHeaderClick",

      "mouseenter #left-menu":            "onMouseEnterLeftMenu",
      "mouseenter #toolbar-frame":        "onMouseEnterToolbar",
      "mouseleave #toolbar-frame":        "onMouseLeaveToolbar",
      "mouseleave #header-wrapper":       "onMouseLeaveHeader",

      "mouseenter .left-menu-icon":       "onMouseEnterToolbarItem",
      "mouseleave .left-menu-icon":       "onMouseLeaveToolbarItem",

      "click .left-menu-icon":            "onLeftMenuListIconClick",

      "click #file-header":               "onFileHeaderClick",
      "click #mail-header":               "onMailHeaderClick",
      "keypress":                            "onKeyPress"
    },

    initialize: function(options) {
      var self = this;
      this.app = options.app;


      // $('body').append('<span id="fineUploader"></span>');

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
            var model;

            if(response.success) {
              self.app.collections['files'].add(response.file, { merge: true });

              model = self.app.collections['files'].get(response.file.id);
              model.on('change', onChange);
            }

            function onChange() {
              var versions = model.get('versions');
              var hasThumb = versions.at(versions.length - 1).get('thumbnailStatus') !== 'GENERATING';
              if (hasThumb) {
                window.location.href = "#file/" + response.file.id;
                model.off('change', onChange);
              }
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

    hidePanel: function (whichPanel) {

      $(whichPanel).animate({
        right: uiVars.hidePanelValue
      }, 350, function() {
        $(whichPanel).hide();
      });

      if ($(document).width() < 1250) {
        $("#content-frame, #header-frame, #alert-content, #chat-input").animate({
          left: '+=110px'
        }, 350, function() {
        });
      }

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

          $("#content-frame, #header-frame, #alert-content, #chat-input").animate({
            left: '-=110px'
          }, 350, function() {
          });

        }

        this.rightpanel = true;
      }
    },

    showMenu: function() {
      if (this.leftmenu) return;

      if (this.selectedListIcon == "icon-search") {
        this.activateSearchList();
      }


      $("#menu-toggle-button, #left-menu-hotspot, #left-menu").animate({
        left: "+=280px"
      }, 350);


      $("#content-frame, #alert-content, #header-frame, #chat-input").animate({
        left: "+=180px"
      }, 350);

      $("#right-panel").animate({
        right: "-=280px"
      }, 350);


      $("left-menu-hotspot").hide();
      this.leftmenu = true;
    },

    hideMenu: function() {

      if (!this.leftmenu) return;

      // refocus chat input in case it's lost focus
      console.log("FOCUS CHAT");
      $("#chat-input-textarea").focus();

      $("#menu-toggle-button, #left-menu-hotspot, #left-menu").animate({
        left: "-=280px"
      }, 350);


      $("#content-frame, #alert-content, #header-frame, #chat-input").animate({
        left: "-=180px"
      }, 350);

      $("#right-panel").animate({
        right: "+=280px"
      }, 350);

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
      this.toggleRightPanel('people-roster');
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

    onMouseEnterToolbarItem: function(e) {
      $(e.target).fadeTo(100, 1.0);
    },

    onMouseLeaveToolbarItem: function(e) {
      if ($(e.target).hasClass('selected')) return true;

      $(e.target).fadeTo(100, 0.6);
    },

    onLeftMenuListIconClick: function(e) {
      // Turn off the old selected list
      $("#"+this.selectedListIcon).removeClass('selected');
      $("#"+this.selectedListIcon).fadeTo(100, 0.6);
      $("#" + $("#"+this.selectedListIcon).data('list')).hide();
      // TODO: We probably want to destroy the list to remove the dom elements

      // enable the new selected list
      this.selectedListIcon = $(e.target).attr('id');
      $("#"+this.selectedListIcon).addClass('selected');
      $("#" + $("#"+this.selectedListIcon).data('list')).show();
      // TODO: Related to the above TODO, we probably only want to populate the list now

      if (this.selectedListIcon == 'icon-search') {
        this.activateSearchList();
      }
    },

    activateSearchList: function () {
      $("#list-search-input").focus();
    },

    onKeyPress: function(e) {
      // return if a form input has focus
      if ( $("*:focus").is("textarea, input") ) return true;

      // return in a modal is open
      if ( $("body").hasClass('modal-open') ) return true;

      if (!this.leftmenu) {
        $("#chat-input-textarea").focus();
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

      if (!this.leftmenu) {
        $("#chat-input-textarea").focus();
        return true;
    }

      // t shows Troupe menu
      // if(e.keyCode == 84) {
      //   this.toggleMenu();
      // }

      // esc returns to the mail view
    }

  });
});
