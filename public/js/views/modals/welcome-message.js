'use strict';

var Marionette = require('backbone.marionette');
var ModalView = require('./modal');
var context = require('../../utils/context');
var template = require('./tmpl/welcome-message-view.hbs');
var apiClient = require('components/apiClient');

var View = Marionette.ItemView.extend({
  template: template,
  ui: {
    welcomeMessage: '#welcome-message-container'
  },

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked, this);
  },

  menuItemClicked: function (type){
    switch(type) {
      case 'submit':
        apiClient.user
          .post('/rooms', { id: context.troupe().id })
          .then(function(body) {
            context.setTroupe(body);
            this.destroyWelcomeMessage();
          }.bind(this));
        break;
    }
  },

  onRender: function (){
    apiClient.room.get('/meta/welcome-message').then(function(welcomeMessage){
      this.ui.welcomeMessage.html(welcomeMessage.html);
    }.bind(this));
  },

  destroyWelcomeMessage: function (){
    this.dialog.hide();
    this.dislog = null;
  },

});

var Modal = ModalView.extend({
  initialize: function(attrs, options) {
    ModalView.prototype.initialize.call(this, options, attrs);
    this.view = new View(attrs, options);
  },
  menuItems: [
    { action: 'submit', pull: 'right', text: 'I Understand', className: 'modal--default__footer__btn' }
  ]
});

module.exports = {
  View: View,
  Modal: Modal
};
