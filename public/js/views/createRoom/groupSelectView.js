"use strict";

var Marionette = require('backbone.marionette');
var context = require('utils/context');
var template = require('./tmpl/groupSelectView.hbs');
var itemTemplate = require('./tmpl/parentItemView.hbs');
var Typeahead = require('views/controls/typeahead');
var Backbone = require('backbone');
var cdn = require('gitter-web-cdn');

module.exports = (function() {

  var ItemModel = Backbone.Model.extend({
    idAttribute: "uri",
    constructor: function(underlyingModel, mappingFunction) {
      // XXX: TODO: deal with minor memory leak here
      this.mappingFunction = mappingFunction;
      var attributes = mappingFunction(underlyingModel);
      Backbone.Model.call(this, attributes);
      this.listenTo(underlyingModel, 'change', this.underlyingChanged);
    },
    underlyingChanged: function(model) {
      var attributes = this.mappingFunction(model);
      this.set(attributes);
    }
  });

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

    // TODO: replace with selectGroupId or something
    /*
    selectUri: function(uri) {
      var collection, predicate, mapper;

      function repoPredicate(troupe) {
        return troupe.get('githubType') === 'REPO' && troupe.get('uri') === uri;
      }

      function orgPredicate(o) {
        return o.get('room') && o.get('room').uri === uri;
      }

      // TODO: only the group case (more like orgs), no troupes
      if(uri.indexOf('/') >= 0) {
        collection = this.troupesCollection;
        predicate = repoPredicate;
        mapper = modelFromRepoTroupe;
      } else {
        if(uri === context.user().get('username')) {
          var userModel = modelFromUser(context.user());
          this.selected(userModel);
          return userModel;
        }

        collection = this.orgsCollection;
        predicate = orgPredicate;
        mapper = modelFromOrg;
      }

      var item = collection.find(predicate);

      if(item) {
        var model = mapper(item);
        this.selected(model);
        return model;
      }

    },
    */

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
      /*
      var self = this;
      var results = self.groupsCollection.map(modelFromOrg);
      collection.set(results, { add: true, remove: true, merge: true });
      */

      if (success) success();
    }

  });


})();
