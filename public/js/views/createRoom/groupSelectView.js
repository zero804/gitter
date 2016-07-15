"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/groupSelectView.hbs');
var itemTemplate = require('./tmpl/parentItemView.hbs');
var Typeahead = require('views/controls/typeahead');

module.exports = (function() {
  return Marionette.ItemView.extend({
    events: {
      'focus @ui.input':    'show',
      'click @ui.input':    'show'
    },
    ui: {
      input: "input#input-parent",
      avatar: "#avatar"
    },

    template: template,
    initialize: function(options) {
      this.groupsCollection = options.groupsCollection;
      this.listenTo(this.groupsCollection, 'add remove change reset sync', this.reset);
    },

    selected: function(group) {
      this.ui.input.val(group.get('uri'));

      if (this.typeahead) {
        this.typeahead.hide();
      }

      this.ui.avatar.css("background-image", "url(" + group.get('avatarUrl') + ")");

      this.trigger('selected', group);
    },

    onRender: function() {
      if(!this.typeahead) {
        this.typeahead = new Typeahead({
          fetch: this.refilter.bind(this),
          collection: this.groupsCollection,
          itemTemplate: itemTemplate,
          el: this.ui.input[0],
          autoSelector: function(input) {
            return function(m) {
              return m.get('name') && m.get('name').indexOf(input) >= 0;
            };
          }
        });
        this.listenTo(this.typeahead, 'selected', this.selected);
      }
    },

    onDestroy: function() {
      this.typeahead.destroy();
    },

    focus: function() {
      this.ui.input.focus();
    },

    show: function() {
      this.typeahead.show();
    },

    hide: function() {
      this.typeahead.hide();
    },

    selectGroupId: function(groupId) {
      var group = this.groupsCollection.find(function(g) {
        return g.get('id') === groupId;
      });
      if (group) {
        this.selected(group);
        return group;
      }
    },

    refilter: function(query, collection, success) {
      if (success) success();
    }

  });


})();
