"use strict";
var $ = require('jquery');
var context = require('utils/context');
var Marionette = require('marionette');
var TroupeViews = require('views/base');
var template = require('./tmpl/getProTemplate.hbs');

module.exports = (function() {


  var View = Marionette.ItemView.extend({
    template: template,

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

    serializeData: function() {
      var org = context.troupe().get('uri').split('/')[0];
      var billingUrl = context.env('billingUrl') + '/create/' + org + '/pro?r=' + window.location.pathname;

      return {
        billingUrl: billingUrl
      };
    },
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Get a Pro plan";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      },
      menuItems: [
        { action: "cancel", text: "Close", className: "trpBtnLightGrey" },
      ]
    });
  
})();

