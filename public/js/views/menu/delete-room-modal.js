"use strict";

var Marionette = require('backbone.marionette');
var ModalView = require('views/modal');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');

var View = Marionette.ItemView.extend({
  tagName: 'p',
  attributes: { style: 'padding-bottom: 15px' },
  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },
  template: function() {
    return 'Are you sure you want to delete this room and all of its contents?';
  },
  menuItemClicked: function(button) {
    if (button !== 'delete') return;

    apiClient.room.delete().then(function() {
      appEvents.trigger('navigation', context.getUser().url, 'home', '');
    });
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = 'Careful Now...';
    var roomName = context.troupe().get('uri');
    options.menuItems = [{ action: 'delete', text: 'Delete "' + roomName + '"', className: 'trpBtnRed trpBtnRight' }];


    ModalView.prototype.initialize.call(this, options);
    this.view = new View();
  }
});

module.exports = Modal;
