'use strict';

var context = require('utils/context');
var Marionette = require('backbone.marionette');
var ModalView = require('./modal');
var apiClient = require('components/apiClient');
var roomSettingsTemplate = require('./tmpl/room-settings-view.hbs');

var View = Marionette.ItemView.extend({
  template: roomSettingsTemplate,

  events:   {
    'click #close-settings' : 'destroySettings',
    'change #github-only': 'formChange'
  },

  modelEvents: {
    change: 'update'
  },

  ui: {
    githubOnly: '#github-only'
  },

  destroySettings : function () {
    this.dialog.hide();
    this.dialog = null;
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
    var providers = (this.ui.githubOnly.is(':checked')) ? ['github'] : [];
    apiClient.room.put('', { providers: providers })
      .then(function(updated) {
        context.setTroupe(updated);
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
  menuItems: []
});

module.exports = Modal;
