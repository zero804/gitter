"use strict";

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var ModalView = require('./modal');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');
var template = require('./tmpl/delete-room-view.hbs');

var View = Marionette.ItemView.extend({
  tagName: 'p',
  attributes: { style: 'padding-bottom: 15px' },
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
        apiClient.room.delete().then(function() {
          appEvents.trigger('navigation', '/home', 'home', '');
        });
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  }
});

var DelayLock = Backbone.Model.extend({
  defaults: {
    locked: true,
    // give enough time to read the warnings
    secondsLeft: 8
  },
  initialize: function() {
    this.tick();
  },
  tick: function() {
    var self = this;
    if (!this.get('locked')) return;

    setTimeout(function() {
      var seconds = self.get('secondsLeft') - 1;
      self.set('secondsLeft', seconds);

      if (seconds <= 0) {
        self.set('locked', false);
      } else {
        self.tick();
      }
    }, 1000);
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = 'Careful Now...';
    var roomName = context.troupe().get('uri');
    options.menuItems = [{
      disabled: true,
      action: 'delete',
      text: 'Delete "' + roomName + '"',
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
