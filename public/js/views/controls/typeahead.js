/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'backbone',
  'marionette',
  './dropdown'
], function(_, Backbone, Marionette, Dropdown) {
  "use strict";


  var TypeaheadView = Marionette.ItemView.extend({
    tagName: 'input',
    events: {
      'change': 'inputChange',
      'cut': 'inputChange',
      'paste': 'inputChange',
      'input': 'inputChange',
      'keydown': 'keydown',
      'keyup': 'keyup',
      'blur': 'blur'
    },
    initialize: function(options) {
      var self = this;

      if(!this.collection) {
        this.collection = new Backbone.Collection();
      }

      this.inputChangeFast = _.debounce(this.inputChangeDebounced.bind(this), 400);
      this.inputChangeSlow = _.debounce(function() {
        self.inputChangeFast();
      }, 800);

      if(options.el) {
        this.attach();
      }
    },

    onRender: function() {
      this.attach();
    },

    attach: function() {
      if(this.dropdown) return;
      this.dropdown = new Dropdown({ collection: this.collection, itemTemplate: this.options.itemTemplate, targetElement: this.el });
      this.listenTo(this.dropdown, 'selected', this.selected);
    },

    onClose: function() {
      if(this.dropdown) {
        this.dropdown.close();
        this.dropdown = null;
      }
    },

    selected: function(m) {
      this.trigger('selected', m);
    },

    blur: function() {
      this.dropdown.hide();
    },

    inputChange: function() {
      var input = this.$el.val();

      if(input.length < 3) {
        this.inputChangeSlow();
      } else {
        this.inputChangeFast();
      }
    },

    inputChangeDebounced: function() {
      var input = this.$el.val();
      if(this.lastFetchInput === input) return;
      this.lastFetchInput = input;

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
          this.dropdown.select();
          break;

        case 38:
          this.dropdown.selectPrev();
          break;

        case 40:
          this.dropdown.show();
          this.dropdown.selectNext();
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
