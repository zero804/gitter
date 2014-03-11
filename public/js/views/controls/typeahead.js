/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'marionette',
  './dropdown',
  './live-search',
], function(Backbone, Marionette, Dropdown, liveSearch) {
  "use strict";

  var TypeaheadView = Marionette.ItemView.extend({
    tagName: 'input',
    events: {
      'keydown': 'keydown',
      'keyup': 'keyup',
      'blur': 'blur'
    },
    initialize: function(options) {
      if(!this.collection) {
        this.collection = new Backbone.Collection();
      }

      if(options.el) {
        this.attach();
      }
    },

    onRender: function() {
      this.attach();
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
      liveSearch(this, this.$el, 'searchTextChanged', { shortDebounce: 400, longDebounce: 800 });

      this.dropdown = new Dropdown({
        collection: this.collection,
        itemTemplate: this.options.itemTemplate,
        targetElement: this.el
      });

      this.listenTo(this.dropdown, 'selected', this.selected);
    },

    onClose: function() {
      if(this.dropdown) {
        this.dropdown.close();
        this.dropdown = null;
      }
    },

    selected: function(m) {
      this.selected = m;
      this.trigger('selected', m);
    },

    blur: function() {
      this.dropdown.hide();
    },

    searchTextChanged: function(input) {
      if(this.options.fetch) {
        this.options.fetch(input, this.collection);
      } else {
        this.collection.fetch({ data: { q: input }}, { add: true, remove: true, merge: true });
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

  return TypeaheadView;
});
