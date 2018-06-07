"use strict";

var Marionette = require('backbone.marionette');
var log = require('../../utils/log');
var logout = require('../../utils/logout');
var context = require('../../utils/context');
var appEvents = require('../../utils/appevents');
var ModalView = require('./modal');
var apiClient = require('../../components/api-client');
var DelayLock = require('../../models/delay-lock-model');
var template = require('./tmpl/delete-account-view.hbs');

var View = Marionette.ItemView.extend({
  tagName: 'p',
  attributes: { style: '' },
  modelEvents: {
    'change': 'render'
  },
  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },
  template: template,
  menuItemClicked: function(button) {
    switch(button) {
      case 'delete':
        // Notify others, that they shouldn't redirect while we are trying to logout
        appEvents.trigger('account.delete-start');

        apiClient.user.delete()
          .then(() => {
            return logout();
          })
          .catch((err) => {
            log.error('Error while deleting account', { exception: err });
            this.model.set('error', `Error while deleting account: ${err} (status: ${err.status})`);
          });
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = 'Careful Now...';
    var username = context.user().get('username');
    options.menuItems = [{
      disabled: true,
      action: 'delete',
      text: `Delete ${username}`,
      className: 'modal--default__footer__btn--negative'
    }];

    var lock = new DelayLock();

    this.listenTo(lock, 'change:locked', function() {
      this.setButtonState('delete', true);
    });

    ModalView.prototype.initialize.call(this, options);
    this.view = new View({
      model: lock
    });
  }
});

module.exports = Modal;
