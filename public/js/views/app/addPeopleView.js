/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'marionette',
  'views/base',
  'utils/context',
  'hbs!./tmpl/addPeople'
], function($, Marionette, TroupeViews, context, template) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,

    ui: {

    },

    regions: {

    },

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'create':
          this.validateAndCreate();
          break;

        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

    onRender: function() {

    },


  });

  return TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Add people to this room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "create", text: "Create", className: "trpBtnGreen" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

});
