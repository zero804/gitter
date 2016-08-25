'use strict';

var Marionette = require('backbone.marionette');
var toggleClass = require('../../utils/toggle-class');
var apiClient = require('../../components/apiClient');
var context = require('../../utils/context');
var ModalView = require('./modal');

var template = require('./tmpl/permissions-view.hbs');

var CreateRoomView = Marionette.LayoutView.extend({
  template: template,

  initialize: function(attrs) {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },


  menuItemClicked: function(button) {
    switch(button) {
      case 'done':
        // done
        break;
    }
  },

});


var Modal = ModalView.extend({
  disableAutoFocus: true,

  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Community Permissions';

    ModalView.prototype.initialize.call(this, options);
    this.view = new CreateRoomView(options);
  },

  menuItems: function() {
    var result = [];

    result.push({
      action: 'done',
      pull: 'right',
      text: 'Done',
      className: 'modal--default__footer__btn'
    });

    return result;
  }
});


module.exports = {
  View: CreateRoomView,
  Modal: Modal
};
