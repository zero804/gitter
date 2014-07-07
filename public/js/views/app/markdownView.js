define([
  'jquery',
  'utils/platform-keys',
  'views/base',
  'hbs!./tmpl/markdownTemplate'
], function($, platformKeys, TroupeViews, markdownTemplate ) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: markdownTemplate,
    events: {

    },

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'showKeyboardShortcuts':
          this.dialog.hide();
          window.location.hash = "#keys";
          break;

        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {

    },

    getRenderData: function() {

    },
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Markdown Help";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      },
      menuItems: [
        { action: "cancel", text: "Close", className: "trpBtnLightGrey" },
        { action: "showKeyboardShortcuts", text: "Keyboard shortcuts ("+ platformKeys.cmd +" + "+ platformKeys.gitter +" + k)", className: "trpBtnBlue trpBtnRight"}
      ]
    });
  });
