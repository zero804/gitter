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
          this.nextScreen();
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
      { action: "cancel", text: "Next", className: "trpBtnGreen" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});
