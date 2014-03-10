/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'marionette',
  'views/base',
  'utils/context',
  'hbs!./tmpl/chooseRoom',
  'utils/appevents'
], function($, Marionette, TroupeViews, context, template, appEvents) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,

    ui: {
      radioCustom: 'input#radio-custom',
      radioRepo: 'input#radio-repo',
    },

    events: {

    },

    regions: {

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

    nextScreen: function() {

    },

    onRender: function() {

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
