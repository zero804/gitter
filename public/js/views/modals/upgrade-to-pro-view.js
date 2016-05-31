"use strict";

var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var Marionette = require('backbone.marionette');
var template = require('./tmpl/upgrade-to-pro-view.hbs');
var ModalView = require('./modal');



var View = Marionette.ItemView.extend({
  template: template,

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  billingUrl: function() {
    var orgName = context.troupe().get('uri').split('/')[0];
    var billingUrl = clientEnv['billingUrl'] + '/create/' + orgName + '/pro?r=' + context.troupe().get('url');
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
    var billingUrl = clientEnv['billingUrl'] + '/create/' + orgName + '/pro?r=' + context.troupe().get('url');

    return {
      orgName: orgName,
      billingUrl: billingUrl,
      maxMemberCount: clientEnv['maxFreeOrgRoomMembers']
    };
  },
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Upgrade to Pro";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    },
    menuItems: [
      { action: "cancel", text: "Close", className: "modal--default__footer__btn--neutral" },
      { action: "upgrade", text: "Upgrade now", className: "modal--default__footer__btn" },
    ]
  });
