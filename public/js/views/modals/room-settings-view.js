'use strict';

var context              = require('utils/context');
var Marionette           = require('backbone.marionette');
var ModalView            = require('./modal');
var apiClient            = require('components/apiClient');
var roomSettingsTemplate = require('./tmpl/room-settings-view.hbs');

var View = Marionette.ItemView.extend({
  template: roomSettingsTemplate,

  events:   {
    'click #close-settings' : 'destroySettings',
  },

  ui: {
    githubOnly: '#github-only',
    welcomeMessage: '#room-welcome-message'
  },

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked, this);
    apiClient.room.get('/meta/welcome-message').then(function(msg){
      console.log('-----------------------');
      console.log(msg);
      console.log('-----------------------');
    });
  },

  destroySettings: function () {
    this.dialog.hide();
    this.dialog = null;
  },

  menuItemClicked: function(action){
    switch(action) {
      case 'submit':
        this.formChange();
        break;
    }
  },

  update: function() {
    var hasGithub = (this.model.get('providers') || []).indexOf('github') !== -1;
    if (hasGithub) {
      this.ui.githubOnly.attr('checked', true);
    } else {
      this.ui.githubOnly.removeAttr('checked');
    }
  },

  onRender: function() {
    this.update();
  },

  formChange: function() {
    var providers             = (this.ui.githubOnly.is(':checked')) ? ['github'] : [];
    var welcomeMessageContent = this.ui.welcomeMessage.val();
    apiClient.room.put('', { providers: providers, welcomeMessage: welcomeMessageContent })
      .then(function(updated) {
        context.setTroupe(updated);
        this.destroySettings();
      }.bind(this));
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Room Settings';
    ModalView.prototype.initialize.apply(this, arguments);
    this.view = new View(options);
  },
  menuItems: [
    { action: 'submit', pull: 'right', text: 'Submit', className: 'modal--default__footer__btn' }
  ]
});

module.exports = Modal;
