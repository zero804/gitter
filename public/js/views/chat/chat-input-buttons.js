"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/chat-input-buttons.hbs');
var platformKeys = require('utils/platform-keys');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var isMobile = require('utils/is-mobile');
require('views/behaviors/tooltip');

var ChatInputButtons = Marionette.ItemView.extend({
  template: template,

  behaviors: {
    Tooltip: {
      '.js-toggle-compose-mode': { titleFn: 'getComposeModeTitle' },
      '.js-markdown-help': { titleFn: 'getShowMarkdownTitle' }
    }
  },

  ui: {
    composeToggle: '.js-toggle-compose-mode'
  },

  onRender: function() {
    // this.options.template is false for first render as it just
    // binds to the existing server-side rendered html.
    // this ensures that the next render will have a template.
    this.options.template = template;
  },

  events: {
    'click .js-toggle-compose-mode': 'toggleComposeMode',
  },

  modelEvents: {
    'change:isComposeModeEnabled': 'render'
  },

  keyboardEvents: {
    'chat.toggle': 'toggleComposeMode'
  },

  getComposeModeTitle: function() {
    var mode = this.model.get('isComposeModeEnabled') ? 'chat' : 'compose';
    return 'Switch to '+ mode +' mode ('+ platformKeys.cmd +' + /)';
  },

  getShowMarkdownTitle: function() {
    return 'Markdown help ('+ platformKeys.cmd +' + '+ platformKeys.gitter +' + m)';
  },

  toggleComposeMode: function() {
    // compose mode is always off for mobile
    if (isMobile()) return;

    this.model.set('isComposeModeEnabled', !this.model.get('isComposeModeEnabled'));
  }

});

cocktail.mixin(ChatInputButtons, KeyboardEventsMixin);

module.exports = ChatInputButtons;
