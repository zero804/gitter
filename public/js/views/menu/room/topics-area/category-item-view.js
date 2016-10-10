'use strict';

var Marionette = require('backbone.marionette');
var appEvents = require('../../../../utils/appevents');
var parseForTemplate = require('gitter-web-shared/parse/forum-category-item');

var template = require('./category-item-view.hbs');

module.exports = Marionette.ItemView.extend({
  tagName: 'li',

  attributes: function() {
    var id = this.model.get('id');
    return {
      'data-id': id,
      id: id,
    };
  },

  template: template,

  ui: {
    link: '.js-left-menu-forum-category-item-link'
  },

  events: {
    'click': 'onActivate',
  },


  initialize: function() {
    this.listenTo(this.model, 'change:focus', this.onModelChangeFocus, this);
    this.listenTo(this.model, 'change:groupUri', this.render, this);
  },

  serializeData: function() {
    var data = parseForTemplate(this.model.toJSON());
    return data;
  },


  onModelChangeFocus: function() {
    var hasFocus = this.model.get('focus');
    if(hasFocus) {
      this.focusElement();
    } else {
      this.blurElement();
    }
  },

  focusElement: function() {
    this.el.classList.add('focus');
    this.ui.link.focus();
  },

  blurElement: function() {
    this.el.classList.remove('focus');
    this.ui.link.blur();
  },

  onActivate: function(e) {
    var data = parseForTemplate(this.model.toJSON());
    appEvents.trigger('navigation', data.url, 'topics', 'Topics - ' + this.model.get('name'))

    e.preventDefault();
    // This is needed to stop the `link-handler` from reloading the whole page :/
    // Not sure how the rest of the left menu links keep from getting called there
    e.stopPropagation();
  }
});
