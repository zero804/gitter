'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');

var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var template = require('./community-creation-invite-people-view.hbs');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-invite-people-step-wrapper'
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);
  },
});
