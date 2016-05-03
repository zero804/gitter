'use strict';

var Marionette = require('backbone.marionette');
var slugify = require('slug');

var template = require('./community-creation-main-view.hbs');

require('views/behaviors/isomorphic');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');

var updateElementValueAndMaintatinSelection = function(el, newValue) {
  var start = el.selectionStart;
  var end = el.selectionEnd;

  el.value = newValue;

  // Restore selection
  if(el === document.activeElement) {
    el.setSelectionRange(start, end);
  }
};

module.exports = Marionette.ItemView.extend({
  template: template,

  attributes: {
    class: 'community-create-main-step-wrapper'
  },

  ui: {
    communityNameInput: '.primary-community-name-input',
    communitySlugInput: '.community-creation-slug-input'
  },

  events: {
    'input @ui.communityNameInput': 'onCommunityNameInputChange',
    'change @ui.communityNameInput': 'onCommunityNameInputChange',
    'input @ui.communitySlugInput': 'onCommunitSlugInputChange',
    'change @ui.communitySlugInput': 'onCommunitSlugInputChange'
  },

  modelEvents: {
    'change:communitySlug': 'onCommunitySlugChange'
  },

  initialize: function(options) {
    console.log('cc-main-view init');
  },

  onCommunityNameInputChange: function() {
    var currentSlug = this.model.get('communitySlug');
    var isUsingCustomSlug = this.model.get('isUsingCustomSlug');

    var newCommunityName = this.ui.communityNameInput[0].value;
    this.model.set({
      communityName: newCommunityName
    });

    var isSlugEmpty = !currentSlug || currentSlug.length === 0;
    if(isSlugEmpty || !isUsingCustomSlug) {
      this.model.set({
        communitySlug: slugify(newCommunityName),
        // Reset back if we started doing an automatic slug again
        isUsingCustomSlug: isSlugEmpty ? false : isUsingCustomSlug
      });
    }
  },

  onCommunitySlugChange: function() {
    updateElementValueAndMaintatinSelection(this.ui.communitySlugInput[0], this.model.get('communitySlug'));
  },

  onCommunitSlugInputChange: function() {
    var newSlug = this.ui.communitySlugInput[0].value;
    this.model.set({
      isUsingCustomSlug: true,
      communitySlug: newSlug
    });
  }
});
