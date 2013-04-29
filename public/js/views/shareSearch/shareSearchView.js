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

    events: {
      'click .removeInvite': 'deselectPerson',
      'click button[type=submit]': 'sendInvites'
    },

    initialize: function() {
      // [ { userId: }, or { email: } ]
      this.invites = [];
    },

    afterRender: function() {
      this.createTypeahead();
    },

    createTypeahead: function() {
      var self = this;
      var sources = {}, source;

      this.$el.find('input[name=inviteSearch]').typeahead({
        source: function(query, process) {
          if(sources[query]) {
            source = sources[query];
            // process(source); not needed
            return sources[query];
          }

          var emptyPreviously = _.some(sources, function(v,k) {
            return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length <= 1;
          });

          if(emptyPreviously) {
            // a previous search with a shorter matching query has returned no results.
            // don't fetch.
            source = sources[query] = [];
            addEmailOption(source, query);
            installToString(source);
            process(source);
            return;
          }

          // fetch from server
          $.ajax({ url: '/user?q=' + query, success:
            function(data) {

              source = data.results;
              sources[query] = source;

              addEmailOption(source, query);
              installToString(source);
              process(source);
            }
          });
        },
        sorter: function(items) {
          return _.sortBy(items, 'displayName');
        },
        matcher: function(item) {
          var query = this.query.trim(), queryWords = query.split(' '), fullname = item.displayName;
          return _.any(fullname.split(' '), function (name) {
            return _.any(queryWords, function(q) {
              return name.toLowerCase().indexOf(q.toLowerCase()) === 0;
            });
          });
        },
        highlighter: function(item) {
          // TODO (maybe) include the avatar, but that would not be recommended for email address invites as the avatar url changes at each keystroke
          return $.fn.typeahead.Constructor.prototype.highlighter.call(this, item.displayName);
        },
        updater: function(value) {
          var item = _.find(source, function(u) {
            return u.id === value || u.email === value;
          });

          // TODO VALIDATE EMAIL ADDRESS FIELD!

          self.selectPerson(item);

          return ''; // empty the search box
        },
        minLength: 2
      });

      function addEmailOption(source, query) {
        // add the query as an email address option
        source.push({ email: query, displayName: query, avatarUrlSmall: '/gravatar/'+query }); // note:  this will provide a diff avatar each key stroke, don't show it in the autocomplete!
      }

      function installToString(source) {
        // install a toString function on each data item so it stores the id in the data-value element attribute
        _.each(source, function(item) {
          item.toString = function() {
            return this.id || this.email;
          };
        });
      }

    },

    selectPerson: function(user) {
      // TODO don't allow adding the same person more than once (alt: don't show them in the autocomplete results)
      var invite = {};
      if (user.id)
        invite.userId = user.id;
      if (user.email)
        invite.email = user.email;

      this.invites.push(invite);

      this.$el.find("#invites").append(rowTemplate({ user: user, value: user.toString() }));
    },

    deselectPerson: function(e) {
      var value = $(e.target).data('value');
      this.$el.find('#invites .invite[data-value="'+value+'"]').remove();
      this.invites = _.filter(this.invites, function(invite) {
        if (invite.userId)
          return invite.userId !== value;
        else
          return invite.email !== value;
      });
    },

    sendInvites: function() {
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(this.invites),
        type: "POST",
        success: function(data) {
           if(data.failed) {
            return;
          }
          $('.modal-content').hide();
          $('.modal-success').show();
          // self.trigger('share.complete', data);
        }
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