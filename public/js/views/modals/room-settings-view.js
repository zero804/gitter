'use strict';

var context = require('utils/context');
var Marionette = require('backbone.marionette');
var ModalView = require('./modal');
var apiClient = require('components/apiClient');
var roomSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var Promise = require('bluebird');

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
    apiClient.room.get('/meta/welcome-message').then(function(welcomeMessage){
      welcomeMessage = (welcomeMessage || { text: '', html: '' });
      if(!!welcomeMessage.text.length) { return  this.initWithMessage(welcomeMessage); }
      return this.initEmptyTextArea();
    }.bind(this));
  },

  destroySettings: function () {
    this.dialog.hide();
    this.dialog = null;
  },

  menuItemClicked: function(action){
    switch(action) {
      case 'submit':
        this.formSubmit();
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

  initEmptyTextArea: function (){
    this.ui.welcomeMessage.attr('placeholder', 'Add a new welcome message here');
  },

  initWithMessage: function (msg){
    this.ui.welcomeMessage.val(msg.text);
  },

  onRender: function() {
    this.update();
  },

  formSubmit: function() {
    var providers             = (this.ui.githubOnly.is(':checked')) ? ['github'] : [];
    var welcomeMessageContent = this.ui.welcomeMessage.val();

    Promise.all([
      apiClient.room.put('', { providers: providers }),
      apiClient.room.put('/meta/welcome-message', { welcomeMessage: welcomeMessageContent }),
    ])
    .spread(function(updatedTroupe /*, metaResponse*/){
      context.setTroupe(updatedTroupe);
      this.destroySettings();
    }.bind(this))
    .catch(function(err){
      //TODO Handle Error
    });
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
