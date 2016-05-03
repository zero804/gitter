'use strict';

var Marionette = require('backbone.marionette');

var template = require('./community-creation-invite-people-view.hbs');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


module.exports = Marionette.ItemView.extend({
  template: template,

  attributes: {
    class: 'community-create-step-wrapper community-create-invite-people-step-wrapper'
  },

  ui: {
    communityNameInput: '.primary-community-name-input',
    communitySlugInput: '.community-creation-slug-input'
  },

  initialize: function(options) {
    console.log('cc-invite-people-view init');
    this.communityCreateModel = options.communityCreateModel;
  },
});
