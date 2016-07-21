"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Dropdown = require('./dropdown');
var liveSearch = require('./live-search');

var TypeaheadView = Marionette.ItemView.extend({
  tagName: 'input',
  events: {
    'keydown': 'keydown',
    'keyup': 'keyup'
  },
  initialize: function(options) {
    if(!this.collection) {
      this.collection = new Backbone.Collection();
    }

    if(!options.disableShowOnAdd) {
      // fix for first typeahead suggestion not triggering
      // the dropdown to show
      //
      // if dropdown.show() is called on every add, then you
      // get weird duplicates in the collectionView (!)
      //
      // tbh, dropdown's support for live typeaheads and static menus
      // does not mix well.
      this.listenToOnce(this.collection, 'add', function() {
        if (this.dropdown) this.dropdown.show();
      });
    }

    // May not exist
    this.autoSelector = options.autoSelector;

    if(options.el) {
      this.attach();
    }
  },

  onRender: function() {
    this.attach();
  },

  /**
   * clear() clears the input element's value
   *
   */
  clear: function () {
    this.el.value = '';
  },

  show: function() {
    if(this.lastFetchInput === undefined) {
      this.searchTextChanged(this.el.value);
    }

    this.dropdown.show();
  },

  hide: function() {
    this.dropdown.hide();
  },

  attach: function() {
    if(this.dropdown) return;
    liveSearch(this, this.$el, 'searchTextChanged', { immediate: 'autoSelect' });

    this.dropdown = new Dropdown({
      collection: this.collection,
      itemTemplate: this.options.itemTemplate,
      itemSerializeData: this.options.itemSerializeData,
      targetElement: this.el
    });

    this.listenTo(this.dropdown, 'selected', this.selected);
  },

  onDestroy: function() {
    if(this.dropdown) {
      this.dropdown.destroy();
      this.dropdown = null;
    }
  },

  selected: function(m) {
    this.selected = m;
    this.trigger('selected', m);
  },

  autoSelect: function() {
    var input = this.el.value;

    if(!this.autoSelector) return;
    if(!input) return;

    var model = this.dropdown.getActive();

    var predicate = this.autoSelector(input);
    if(model && predicate(model)) return; // Existing model matches

    var matches = this.collection.filter(predicate);
    if(matches.length === 0) return;
    if(matches.length === 1) {
      this.dropdown.setActive(matches[0]);
      return;
    }

    this.dropdown.setActive(matches[0]);
  },
  searchTextChanged: function(input) {
    var self = this;

    function fetchSuccess() {
      self.autoSelect();
    }
    if(this.options.fetch) {
      this.options.fetch(input, this.collection, fetchSuccess);
    } else {
      this.collection.fetch({ data: { q: input }}, { add: true, remove: true, merge: true, success: fetchSuccess });
    }

    this.dropdown.show();
  },

  keydown: function(e) {
    switch(e.keyCode) {
      case 13:
        this.dropdown.selectActive();
        break;

      case 38:
        this.dropdown.selectPrev();
        break;

      case 40:
        if(this.dropdown.active()) {
          this.dropdown.selectNext();
        } else {
          this.dropdown.show();
        }
        break;

      case 27:
        if(!this.dropdown.active()) {
          // Propogate
          return;
        }

        this.dropdown.hide();
        break;

      default:
        return;
    }

    e.stopPropagation();
    e.preventDefault();
  }
});

module.exports = TypeaheadView;
