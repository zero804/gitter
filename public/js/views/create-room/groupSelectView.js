'use strict';

var Marionette = require('backbone.marionette');
var fuzzysearch = require('fuzzysearch');
const debug = require('debug-proxy')('app:group-select-view');
var Typeahead = require('../controls/typeahead');
var template = require('./tmpl/groupSelectView.hbs');
var itemTemplate = require('./tmpl/parentItemView.hbs');

var GroupSelectView = Marionette.ItemView.extend({
  events: {
    'focus @ui.input': 'show',
    'blur @ui.input': 'hide',
    'click @ui.input': 'show'
  },
  ui: {
    input: 'input#input-parent',
    avatar: '#avatar'
  },

  template: template,
  initialize: function(options) {
    this.groupsCollection = options.groupsCollection;
    this.dropdownClass = options.dropdownClass;
    this.selectedGroup = null;
    this.listenTo(this.groupsCollection, 'add remove change reset sync', this.reset);
  },

  getSelected: function() {
    return this.selectedGroup;
  },

  // Used for when we programmatically select a group
  onGroupSelected: function(group) {
    debug(`onGroupSelected ${group.get('uri')}(${group.get('id')})`);
    this.selectedGroup = group;
    this.ui.input.val(group.get('uri'));

    this.ui.avatar.css('background-image', 'url(' + group.get('avatarUrl') + ')');

    this.trigger('selected', group);
  },

  // Used for when the user selects a group
  // This will close the typeahead after choosing a group
  onUiSelected: function(group) {
    debug(`onUiSelected ${group.get('uri')}(${group.get('id')})`);
    this.onGroupSelected(group);

    if (this.typeahead) {
      this.typeahead.hide();
    }
  },

  onRender: function() {
    if (!this.typeahead) {
      this.typeahead = new Typeahead({
        disableShowOnAdd: true,
        backdropClass: 'group-select-view-dropdown-backdrop',
        fetch: this.refilter.bind(this),
        collection: this.groupsCollection,
        itemTemplate: itemTemplate,
        el: this.ui.input[0],
        dropdownClass: this.dropdownClass,
        autoSelector: function(input) {
          return function(m) {
            var mName = m.get('name') || '';
            return fuzzysearch(input.toLowerCase(), mName.toLowerCase());
          };
        }
      });
      this.listenTo(this.typeahead, 'selected', this.onUiSelected);
    }
  },

  onDestroy: function() {
    this.typeahead.destroy();
  },

  focus: function() {
    this.ui.input.focus();
  },

  show: function() {
    debug('show');
    this.typeahead.show();
  },

  hide: function() {
    debug('hide');
    this.typeahead.hide();
  },

  selectGroupId: function(groupId) {
    debug(`selectGroupId ${groupId}`);
    var group = this.groupsCollection.find(function(g) {
      return g.get('id') === groupId;
    });
    if (group) {
      this.onGroupSelected(group);
      return group;
    }
  },

  refilter: function(query, collection, success) {
    if (success) success();
  }
});

module.exports = GroupSelectView;
