/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/shareView',
  'hbs!./tmpl/shareRow',
  'bootstrap-typeahead' // No reference
  // './shareTableView',
//  'jquery-placeholder', // No reference
// 'jquery-validate'  // No reference
], function($, _, TroupeViews, template, rowTemplate) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function() {
    },

    afterRender: function() {
      this.$el.find('input[name=inviteSearch]').typeahead({
        source: function(query, process) {
          $.ajax({ url: '/user?q=' + query, success: function(data) {
            var names = _.map(data.results, function(u) {
              u.toString = function() {return u.displayName;};
              return u.displayName;
            });

            process(data.results);
            }
          });
        },
        sorter: function(items) {
          return _.sortBy(items, 'displayName');
        },
        matcher: function(item) {
          var query = this.query.trim(), fullname = item.displayName;
          return _.some(fullname.split(' '), function (name) {
            return name.indexOf(query) === 0;
          });
        },
        highlighter: function(item) {
          return $.fn.typeahead.Constructor.prototype.highlighter.call(this, item.displayName);
        },
        updater: function(item) {
          return item;
        }
        /*name: 'users',
        remote: '/user?q=%QUERY',
        cache: false,
        filter: function(data) {
          _.each(data.results, function(user) {
            user.value = user.displayName;
            user.tokens = user.displayName.split(' ');
          });

          return data.results;
        }*/
      });
    }

  });


  var Modal = TroupeViews.Modal.extend({
    initialize: function() {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});