define([
  'jquery',
  'utils/platform-keys',
  'views/base',
  'hbs!./tmpl/keyboardTemplate'
], function($, platformKeys, TroupeViews, keyboardTemplate ) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: keyboardTemplate,
    events: {

    },

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'showMarkdownHelp':
          this.dialog.hide();
          window.location.hash = "#markdown";
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
      return {
        cmdKey: platformKeys.cmd,
        roomKey: platformKeys.room,
        gitterKey: platformKeys.gitter
      };
    },
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Keyboard Shortcuts";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      },
      menuItems: [
        { action: "cancel", text: "Close", className: "trpBtnLightGrey" },
        { action: "showMarkdownHelp", text: "Markdown Help ("+ platformKeys.cmd +" + "+ platformKeys.gitter +" + m)", className: "trpBtnBlue trpBtnRight"}
      ]
    });
  });
