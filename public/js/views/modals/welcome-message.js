'use strict';

var Marionette = require('backbone.marionette');
var ModalView = require('./modal');
var context = require('utils/context');
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

  //TODO may want to prefetch this
  onRender: function (){
    apiClient.room.get('/meta').then(function(meta){
      //I know this is not right, don't bust my balls. Need to figure out
      //how to do this correctly, ie how to sanitise this before injecting it
      this.ui.welcomeMessage.html(meta.welcomeMessage.html);
    }.bind(this));
  },

  destroyWelcomeMessage: function (){
    this.dialog.hide();
    this.dislog = null;
  },

});

var Modal = ModalView.extend({
  initialize: function(attrs, options) {
    options = (options || {});
    options.title = 'One sec, old bean ...';
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
