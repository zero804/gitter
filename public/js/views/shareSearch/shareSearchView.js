/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'marionette',
  'utils/context',
  'views/base',
  'cocktail',
  'views/infinite-scroll-mixin',
  'hbs!./tmpl/shareSearchView',
  'hbs!./tmpl/shareRow',
  'hbs!./tmpl/noContacts',
  'zeroclipboard',
  'utils/appevents',
  'collections/suggested-contacts',
  'bootstrap-typeahead', // No reference
  'utils/validate-wrapper' // No reference
], function($, _, Marionette, context, TroupeViews, cocktail, InfiniteScrollMixin, template,
  rowTemplate, noContactsTemplate, ZeroClipboard, appEvents, suggestedContactModels) {
  "use strict";

  var ContactView = TroupeViews.Base.extend({
    template: rowTemplate,
    rerenderOnChange: true,
    events: {
      'click .trpInviteButton': 'inviteClicked'
    },
    getRenderData: function() {
      var d = this.model.toJSON();
      d.invited = d.status === 'invited';
      d.member = d.status === 'member';
      d.connected = d.status === 'connected';

      return d;
    },
    inviteClicked: function() {
      if(this.model.get('status')) {
        return;
      }
      this.model.set('status', 'inviting');

      var invite;
      if(this.model.get('userId')) {
        invite = { userId: this.model.get('userId') };
      } else {
        var email = this.model.get('emails')[0];
        invite = { email: email };
      }

      $.ajax({
        url: this.options.endpoint,
        contentType: "application/json",
        dataType: "json",
        context: this,
        data: JSON.stringify(invite),
        type: "POST",
        success: function() {
          this.model.set('status', 'invited');
          appEvents.trigger('searchSearchView:success');
        }
      });

    }

  });

  var CollectionView = Marionette.CollectionView.extend({
    itemView: ContactView,
    initialize: function() {
      var self = this;
      this.emptyView = TroupeViews.Base.extend({
        template: noContactsTemplate,
        getRenderData: function() {
          var query= self.collection._currentQuery;
          return { query: query && query.q };
        },
        // mobile safari 6.1 will refuse to render without this
        afterRender: function() {
          this.el.style.display='none';
          this.el.style.display='block';
          var uselessQueryToTriggerReflow = this.el.offsetHeight;
          uselessQueryToTriggerReflow = uselessQueryToTriggerReflow;
        }
      });
    }

  });


  cocktail.mixin(CollectionView, InfiniteScrollMixin, TroupeViews.SortableMarionetteView, TroupeViews.LoadingCollectionMixin);

  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      'mouseover #copy-button' :      'createClipboard',
      'change #custom-email':         'onSearchChange',
      'keyup #custom-email':       'onSearchChange'
    },

    // when instantiated by default (through the controller) this will reflect on troupeContext to determine what the invite is for.
    //
    initialize: function(options) {
      if(!options) options = {};
      this._options = options;

      this.collection = new suggestedContactModels.Collection();
      this.collection.query(this.getQuery());

      this.searchLimited = _.debounce(this.search.bind(this));
      this.invites = [];


      this.addCleanup(function() {
        if(this.clip) this.clip.destroy();
      });
    },

    isConnectMode: function() {
      if(this._options.inviteToConnect) return true;
      if(this._options.inviteToTroupe) return false;

      return !context.inTroupeContext() && !context.inOneToOneTroupeContext();
    },

    getShareUrl: function() {
      var connectMode = this.isConnectMode();

      return context.env('basePath') + (connectMode ? context.getUser().url : context.getTroupe().url);
    },

    getRenderData: function() {
      var connectMode = this.isConnectMode();
      var user = context.getUser();
      var troupe = !connectMode && context.getTroupe();

      if (!connectMode && !troupe) throw new Error("Need a troupe");

      var data = {
        connectMode: connectMode,
        user: user,
        troupe: troupe,
        importedGoogleContacts: context().importedGoogleContacts,
        shareUrl: this.getShareUrl(),
        basePath: context.env('basePath'),
        returnToUrl: encodeURIComponent(window.location.pathname + window.location.hash)
      };

      return data;
    },

    getInviteEndpoint: function() {
      if(this.isConnectMode()) {
        return '/api/v1/inviteconnections';
      } else {
        return '/troupes/' + context.getTroupeId() + '/invites';
      }
    },

    afterRender: function() {
      this.collectionView = new CollectionView({
        el: this.$el.find("#invites"),
        collection: this.collection,
        itemViewOptions: {
          endpoint: this.getInviteEndpoint()
        }
      }).render();
      this.$el.find('#custom-email').placeholder();
      var self = this;
      this.$el.find('form').validate({
        rules: {
          email: {
            required: true,
            email: true
          }
        },
        messages: {
          email: {
            required: "We need to know an email address to invite.",
            email: "Hmmm, that doesn't look like an email address."
          }
        },
        showErrors: function(errorMap, errorList) {
          if (errorList.length > 0) {
            $('.share-failure').show();
            $('.trpModalInfo').hide();
          }
          else {
            $('.share-failure').hide();
            $('.trpModalInfo').show();
          }
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        },
        submitHandler: function() {
          self.inviteCustomEmail();
        }
      });
    },

    onSearchChange: function() {
      var emailField = this.$el.find('#custom-email');

      if(this._prevSearch !== emailField.val()) {
        this._prevSearch = emailField.val();
        if(!emailField.val()) {
          this.appendInvitesAfterSearch();
        }

        this.searchLimited();
      }
    },

    appendInvitesAfterSearch: function() {
      this.collection.once('search:fetch:complete', function() {
        this.invites.forEach(function(inviteModel) {
          this.collection.unshift(inviteModel);
        }, this);
      }, this);
    },

    inviteCustomEmail: function() {
      var emailField = this.$el.find('#custom-email');
      var email = emailField.val();
      var model = new suggestedContactModels.Model({
        displayName: email,
        avatarUrl: '/avatarForEmail/' + email,
        emails: [email],
        status: 'inviting'
      });

      $.ajax({
        url: this.getInviteEndpoint(),
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({email: email}),
        type: "POST",
        success: function() {
          model.set('status', 'invited');
          appEvents.trigger('searchSearchView:success');
        }
      });
      emailField.val('');
      this.invites.push(model);
      this.onSearchChange();
    },

    getQuery: function() {
      var emailField = this.$el.find('#custom-email');
      var q = { q: emailField.val() };

      if(this.isConnectMode()) {
        q.statusConnect = 1;
        q.excludeConnected = 1;
      } else {
        var troupeId = context.getTroupeId();
        q.statusToTroupe = troupeId;
        q.excludeTroupeId = troupeId;
      }

      return q;
    },

    search: function() {
      var query = this.getQuery();
      this.collection.query(query);
    },

    closeDialog: function() {
      this.dialog.hide();
    },

    createClipboard : function() {
      if(this.clip) return;

      ZeroClipboard.setMoviePath( 'repo/zeroclipboard/ZeroClipboard.swf' );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText(this.getShareUrl());
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
    }

  });


  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      if (options.inviteToConnect) {
        options.title = "Connect with people";
      } else {
        options.title = "Invite people to " + context.getTroupe().name;
      }
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.$el.addClass('trpInviteModal');
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
