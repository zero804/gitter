/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'utils/context',
  'hbs!./tmpl/parentSelectView',
  'hbs!./tmpl/parentItemView',
  'typeahead',
  'views/controls/dropdown',
  'backbone'
], function(Marionette, context, template, itemTemplate, Typeahead, Dropdown, Backbone) {
  "use strict";

  return Marionette.Layout.extend({
    events: {
      'click input#input-parent': function() {
        // this.typeahead.open();
        // this.typeahead.dropdown.update('');
        this.dropdown.show();
      }
    },
    regions: {
      dropdownRegion: '#dd-region',
    },
    ui: {
      input: "input#input-parent"
    },

    template: template,
    initialize: function(options) {
      this.orgsCollection = options.orgsCollection;
      this.troupesCollection = options.troupesCollection;

      var c = new Backbone.Collection();
      c.add(new Backbone.Model({ title: 'moo' }));
      this.dropdown = new Dropdown({ collection: c });
    },

    onRender: function() {
      this.dropdownRegion.show(this.dropdown);

      return;
      var self = this;
      this.typeahead = new Typeahead({
        input: this.ui.input,
        autoselect: true, //o.autoselect,
        minLength: 0,
        datasets: [{
          templates: {
            suggestion: itemTemplate
          },
          displayKey: 'name',
          source: function(query, cb) {
            var results;
            if(!query) {
              return cb(defaultResults());
            }

            if(query.indexOf('/') >= 0) {
              return cb(self.troupesCollection.filter(function(troupe) {
                  return troupe.get('githubType') === 'REPO' && troupe.get('uri').indexOf(query) === 0;
                }).map(function(troupe) {
                  return {
                    name: troupe.get('name'),
                    type: 'repo',
                    repoType: true
                  };
                }));
            }

            results = defaultResults().filter(function(org) {
              return org.name.toLowerCase().indexOf(query) === 0;
            });

            return cb(results);

            function defaultResults() {
              var user = context.user();

              return self.orgsCollection.map(function(a) {
                return {
                  name: a.get('name'),
                  avatarUrl: a.get('avatar_url'),
                  orgType: true
                };
              }).concat({
                name: user.get('username'),
                avatarUrl: user.get('avatarUrlSmall'),
                userType: true
              });
            }
          }
        }]
      });

      setTimeout(function() {
      self.typeahead.open();
      self.typeahead.dropdown.update('');
      }, 1);

    }
  });

});
