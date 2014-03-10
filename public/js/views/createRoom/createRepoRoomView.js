/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'views/base',
  './repoSelectView',
  'hbs!./tmpl/createRepoRoom',
  'utils/appevents'
], function(Marionette, TroupeViews, RepoSelectView, template, appEvents) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,

    ui: {

    },

    events: {
      // 'change @ui.roomNameInput': 'roomNameChange',
      // 'cut @ui.roomNameInput': 'roomNameChange',
      // 'paste @ui.roomNameInput': 'roomNameChange',
      // 'input @ui.roomNameInput': 'roomNameChange'
    },

    regions: {
      repoSelectRegion: '#repo-select',
    },

    initialize: function() {
      this.repoSelectView = new RepoSelectView();
      this.listenTo(this.repoSelectView, 'selected', this.repoSelected);
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },
    repoSelected: function(r) {
      appEvents.trigger('navigation', '/' + r.get('uri'), 'chat', r.get('name'));
      this.dialog.hide();
    },
    menuItemClicked: function(button) {
      switch(button) {
        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

    validateAndCreate: function() {
    },

    onRender: function() {
      if(!this.repoSelectRegion.currentView) {
        this.repoSelectRegion.show(this.repoSelectView);
      }
    },

    roomNameChange: function() {
    },


  });

  var Modal = TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a repo chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});
