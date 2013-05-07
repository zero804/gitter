/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/shareView',
  'hbs!./tmpl/shareRow',
  'bootstrap-typeahead', // No reference
  'jquery-validate'  // No reference
], function($, _, TroupeViews, template, rowTemplate) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      'keydown input': 'preventSubmit',
      'click .removeInvite': 'deselectPerson',
      'click button[type=submit]': 'sendInvites'
    },

    initialize: function() {
      // [ { userId: }, or { email: } ]
      this.invites = [];
    },

    afterRender: function() {
      this.createTypeahead();
      this.validate();
    },

    preventSubmit: function(e) {
      if (e.keyCode == 13) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },

    validate: function() {
      return this.$el.find('#share-form').validate({
        rules: {
          inviteSearch: {
            email: true
          }
        },
        debug: true,
        messages: {
          inviteSearch: {
            email: "Enter a valid email address or invite someone on the list below."
          }
        },
        showErrors: function(errorMap, errorList) {
          /*
          if (errorList.length === 0) $('.share-failure').hide();
          if (errorList.length > 0) $('.share-failure').show();
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
          */
        }

      });
    },

    valid: function() {
      return this.validate().element($('[name=inviteSearch]'));
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
          $.ajax({ url: '/user?excludeTroupeId='+window.troupeContext.troupe.id+'&q=' + query, success:
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
          return _.sortBy(items, function(o) {
            return (o.nonSelectable || o.email) ? '' : o.displayName;
          });
        },
        matcher: function(item) {
          var already = _.find(self.invites, function(i) {
            if (i.userId)
              return i.userId == item.id;
            else
             return i.email == item.email;
          });

          return !already;
        },
        highlighter: function(item) {
          // modified from bootstrap-typeahead.js
          var name = item.displayName;
          var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
          var str = name.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
            return '<span class="trpBodyMedium">' + match + '</strong>';
          });

          var html = ((item.avatarUrlSmall) ? '<img src="'+item.avatarUrlSmall+'"  class="trpDisplayPicture avatar-xs trpSearchInviteResult" width="30"/>' : '') + '<span class="trpBodyMedium">' + str + '</span>';

          return html;
        },
        updater: function(value) {
          var item = _.find(source, function(u) {
            return u.id === value || u.email === value;
          });

          // validate email address or accept existing user
          if ((item && item.id) || self.valid()) {
            self.selectPerson(item);

            return ''; // empty the search box
          }

          return this.query;
        },
        minLength: 2
      });

      function addEmailOption(source, query) {
        if (self.valid()) {
          // add the query as an email address option
          source.push({ email: query, displayName: query, avatarUrlSmall: '/gravatar/'+query }); // note:  this will provide a diff avatar each key stroke, don't show it in the autocomplete!
        } else {
          // add a non-selectable option which says continue typing an email address
          source.push({ displayName: "Continue typing an email address to invite someone else", nonSelectable: true });
        }
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

    serialize: function() {
      return JSON.stringify(this.invites);
    },

    sendInvites: function() {
      // don't let users submit unless there is at least one invite (show error message in .share-failure  )
      if (this.invites.length === 0) {
        return alert("Please select at least one user or email address to send to, or press escape to cancel.");
      }

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
        contentType: "application/json",
        dataType: "json",
        data: this.serialize(),
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