define([
  'jquery',
  'marionette',
  'views/app/uiVars',
  'components/modal-region'
  ], function($, Marionette, uiVars, modalRegion) {
  "use strict";

  /** @const */
  var BACKSPACE = 8;

  var touchEvents = {
    "click #menu-toggle-button":        "onMenuToggle",
    "keypress":                         "onKeyPress"
  };

  var mouseEvents = {
    "click #menu-toggle-button":        "onMenuToggle",
    "mouseenter #left-menu-hotspot":    "onLeftMenuHotspot",
    "mouseleave #left-menu-hotspot":    "onLeftMenuHotspotLeave",
    "mouseenter #content-frame":        "onMouseEnterContentFrame",
    "keypress":                         "onKeyPress",
    "keydown":                          "onKeyDown",
    "click #troupe-more-actions":       "toggleTroupeMenu"
  };

  var AppIntegratedLayout = Marionette.Layout.extend({

    el: 'body',

    regions: {
      leftMenuRegion: "#left-menu"
    },

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    initialize: function() {
      this.dialogRegion = modalRegion;
      this._leftMenuLockCount = 0;
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

      setTimeout(function() {
        self._menuAnimating = false;
      }, 350);

      $("#left-menu .js-menu").addClass("visible");
      $("#mini-left-menu, #mini-left-menu-container").addClass("active");
      // $("#iframe-panel, #menu-toggle-button").addClass("leftCollapse");

      this.leftmenu = true;
    },

    closeLeftMenu: function() {
      if(!this.leftmenu) return;
      this._leftMenuLockCount = 0;

      // refocus chat input in case it's lost focus but don't do that on tablets
      if (!window._troupeIsTablet) $("#chat-input-textarea").focus();

      var self = this;
      this._menuAnimating = true;

      setTimeout(function() {
        self._menuAnimating = false;
      }, 350);

      $("#mini-left-menu, #mini-left-menu-container").removeClass("active");
      // $("#iframe-panel, #menu-toggle-button").removeClass("leftCollapse");
      $("#left-menu .js-menu").removeClass("visible");

      this.leftmenu = false;
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
      var self = this;
      this.menuTimer = setTimeout(function() {
        delete this.menuTimer;
        self.showMenu();
      }, 100);
    },

    onLeftMenuHotspotLeave: function() {
      if (this.menuTimer) {
        clearTimeout(this.menuTimer);
      }
    },

    onMouseEnterContentFrame: function() {
      if (this.leftmenu) {
        this.hideMenu();
      }
    },

    activateSearchList: function () {
      $("#list-search-input").focus();
    },

    onKeyDown: function(e) {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.keyCode === BACKSPACE) {
        e.stopPropagation();
        e.preventDefault();
      }
    }

  });

  return AppIntegratedLayout;
});
