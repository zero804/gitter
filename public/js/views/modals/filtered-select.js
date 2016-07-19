'use strict';

var Marionette = require('backbone.marionette');
var Typeahead = require('views/controls/typeahead');
var FilteredCollection = require('backbone-filtered-collection');


var GroupSelectView = Marionette.ItemView.extend({
  events: {
    'focus': 'show',
    'click': 'show'
  },


  initialize: function(options) {
    this.filter = options.filter;
    this.collection = options.collection;
    this.itemTemplate = options.itemTemplate;

    this.filteredCollection = new FilteredCollection({
      collection: this.collection
    });
    this.refilter('', this.filteredCollection);

    this.typeahead = new Typeahead({
      el: this.el,
      disableShowOnAdd: true,
      collection: this.filteredCollection,
      itemTemplate: this.itemTemplate,
      fetch: this.refilter.bind(this),
      autoSelector: function(input) {
        return function(model) {
          this.filter(input, model);
        }.bind(this);
      }.bind(this)
    });

    this.listenTo(this.typeahead, 'selected', this.selected);
    this.listenTo(this.collection, 'add remove change reset sync', this.reset);
  },

  getSelected: function() {
    return this.selectedGroup;
  },

  selected: function(group) {
    if (this.typeahead) {
      this.typeahead.hide();
    }

    this.trigger('selected', group);
  },

  onDestroy: function() {
    this.typeahead.destroy();
  },

  show: function() {
    this.typeahead.show();
  },

  hide: function() {
    this.typeahead.hide();
  },

  refilter: function(input, collection, success) {
    collection.setFilter(function(model) {
      return this.filter(input, model);
    }.bind(this));

    if (success) success();
  }

});

module.exports = GroupSelectView;
