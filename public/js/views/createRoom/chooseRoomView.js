
define([
  'marionette',
  'views/base',
  './tmpl/chooseRoom.hbs',
], function(Marionette, TroupeViews, template) {
  "use strict";

  var View = Marionette.ItemView.extend({
    template: template,

    ui: {
      radioCustom: 'input#radio-custom',
      radioRepo: 'input#radio-repo',
    },

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'next':
          if(this.ui.radioRepo[0].checked) {
            window.location.hash = "#createreporoom";
          }

          if(this.ui.radioCustom[0].checked) {
            window.location.hash = "#createcustomroom";
          }
          break;

        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

  });

  var Modal = TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "next", text: "Next", className: "trpBtnGreen" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});
