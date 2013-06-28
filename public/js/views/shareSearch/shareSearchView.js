/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/shareSearchView',
  'hbs!./tmpl/shareRow',
  'zeroclipboard',
  'bootstrap-typeahead', // No reference
  'utils/validate-wrapper' // No reference
], function($, _, context, TroupeViews, template, rowTemplate, ZeroClipboard) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      'keydown input': 'preventSubmit',
      'hover #copy-button' : 'createClipboard',
      'click .removeInvite': 'deselectPerson',
      'submit #share-form': 'sendInvites'
    },

    // when instantiated by default (through the controller) this will reflect on troupeContext to determine what the invite is for.
    //
    initialize: function(options) {
      // [ { userId: }, or { email: } ]
      this.invites = [];

      if (options.overrideContext === true) {
        this.data = {
          inviteToTroupe: options.inviteToTroupe,
          inviteToConnect: options.inviteToConnect,

          troupe: options.troupe,
          user: options.user
          // , inviteUser: options.inviteUser
        };
      }
      else {
        this.data = {
          inviteToTroupe: context.inTroupeContext() || context.inOneToOneTroupeContext(),
          inviteToConnect: context.inUserhomeContext(),

          troupe: context.getTroupe(),
          user: context.getUser()
        };
      }

      if (this.data.inviteToTroupe && !this.data.troupe) throw new Error("Need a troupe");
      if (this.data.inviteToConnect && !this.data.user) throw new Error("Need a viewer");

      this.data.uri = (this.data.inTroupeContext) ? this.data.troupe.uri : this.data.user.username;
      this.data.basePath = context().basePath;
      this.addCleanup(function() {
        if(this.clip) this.clip.destroy();
      });
    },

    afterRender: function() {
      this.createTypeahead();
      this.validate();
    },

    createClipboard : function() {
      if(this.clip) return;

      ZeroClipboard.setMoviePath( 'repo/zeroclipboard/ZeroClipboard.swf' );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText( this.data.basePath + "/" + this.data.uri );
      // clip.glue( 'copy-button');
      // make your own div with your own css property and not use clip.glue()
      var flash_movie = '<div>'+clip.getHTML(width, height)+'</div>';
      var width = $("#copy-button").outerWidth()+4;
      var height =  $("#copy-button").height()+10;
      flash_movie = $(flash_movie).css({
          position: 'relative',
          marginBottom: -height,
          width: width,
          height: height,
          zIndex: 101
          });
      $("#copy-button").before(flash_movie);
      this.clip=clip;
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
        showErrors: function(/*errorMap, errorList*/) {
          // don't show errors, just use the .valid() method to tell if
          // the input is a valid email address
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
          var url = '/user';
          var urlData = { excludeTroupeId: context.getTroupeId(), q: query };
          $.ajax({ url: '/user', data: urlData, success:
            function(data) {

              source = data.results || [];
              sources[query] = source;

              addEmailOption(source, query);
              installToString(source);
              process(source);
            }
          });
        },
        sorter: function(items) {
          return _.sortBy(items, function(o) {
            return o.displayName ? '' : (o.nonSelectable || o.email);
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
          source.push({ displayName: "You can also type an email address to invite somebody new.", nonSelectable: true });
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

      if (this.invites.length === 0) {
        $('.trpSearchInvites').empty();
      }

      if (user.id)
        invite.userId = user.id;
      if (user.email)
        invite.email = user.email;

      this.invites.push(invite);

      var invitesEl = this.$el.find("#invites");
      invitesEl.append(rowTemplate({ user: user, value: user.toString() })).scrollTop(invitesEl.height());
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

    sendInvites: function(e) {
      if(e) e.preventDefault();

      // don't let users submit unless there is at least one invite (show error message in .share-failure  )
      if (this.invites.length === 0) {
        return alert("Please select at least one user or email address to send to, or press escape to cancel.");
      }

      var ajaxEndpoint = (this.data.inviteToTroupe) ? "/troupes/" + context.getTroupeId() + "/invites" : "/api/v1/inviteconnections";

      $.ajax({
        url: ajaxEndpoint,
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
      this.$el.addClass('trpInviteModal');
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});