"use strict";
var context = require('utils/context');
var Marionette = require('marionette');
var TroupeViews = require('views/base');
var template = require('./tmpl/upgradeToProTemplate.hbs');

module.exports = (function() {


  var View = Marionette.ItemView.extend({
    template: template,

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    billingUrl: function() {
      var orgName = context.troupe().get('uri').split('/')[0];
      var billingUrl = context.env('billingUrl') + '/create/' + orgName + '/pro?r=' + window.location.pathname;
      return billingUrl;
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'cancel':
          this.dialog.hide();
          break;
        case 'upgrade':
          window.open(this.billingUrl());
          break;
      }
    },

    serializeData: function() {
      var orgName = context.troupe().get('uri').split('/')[0];
      var billingUrl = context.env('billingUrl') + '/create/' + orgName + '/pro?r=' + window.location.pathname;

      return {
        orgName: orgName,
        billingUrl: billingUrl
      };
    },
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Upgrade to Pro";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      },
      menuItems: [
        { action: "upgrade", text: "Upgrade now", className: "trpBtnGreen" },
        { action: "cancel", text: "Close", className: "trpBtnLightGrey" },
      ]
    });
  
})();

