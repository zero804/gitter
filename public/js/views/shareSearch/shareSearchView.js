/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'utils/context',
  'views/base',
  'cocktail',
  'views/infinite-scroll-mixin',
  'hbs!./tmpl/shareSearchView',
  'hbs!./tmpl/shareRow',
  'zeroclipboard',
  'utils/appevents',
  'collections/suggested-contacts',
  'bootstrap-typeahead', // No reference
  'utils/validate-wrapper' // No reference
], function($, _, Backbone, Marionette, context, TroupeViews, cocktail, InfiniteScrollMixin, template,
  rowTemplate, ZeroClipboard, appEvents, suggestedContactModels) {
  "use strict";

  // appEvents.trigger('searchSearchView:select');
  // appEvents.trigger('searchSearchView:success');

  var ContactModel = Backbone.Model.extend({
    ajaxEndpoint: '',
    displayName: '',
    email: '',
    invited: false,
    validate: function(attr) {
      if(!attr.email) {
        return "no email set";
      }
      if(!attr.ajaxEndpoint) {
        return "invalid ajaxEndpoint";
      }
    },
    invite: function() {
      if(this.isValid() && !this.get('invited')) {
        $.post(this.get('ajaxEndpoint'), {
          invites: [{email: this.get('email')}]
        });
        this.set('invited', true);
      }
    }
  });

  var ContactView = TroupeViews.Base.extend({
    template: rowTemplate,
    events: {
      'click button': 'invite'
    },
    initialize: function(){
      this.listenTo(this.model, 'change', this.render);
    },
    invite: function() {
      //this.model.invite();
    }

  });

  var CollectionView = Marionette.CollectionView.extend({
    itemView: ContactView
  });

  cocktail.mixin(CollectionView, InfiniteScrollMixin, TroupeViews.SortableMarionetteView);

  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      'mouseover #copy-button' :      'createClipboard',
      'click #custom-email-button':   'onCustomEmailClick',
      'change #custom-email':         'onSearchChange',
      'keyup #custom-email':       'onSearchChange'
    },

    // when instantiated by default (through the controller) this will reflect on troupeContext to determine what the invite is for.
    //
    initialize: function(options) {
      if(!options) options = {};
      this._options = options;

      var ajaxEndpoint;
      var inviteToConnect = options.inviteToConnect;

      if(inviteToConnect) {
        ajaxEndpoint = '/api/v1/inviteconnections';
      } else {
        ajaxEndpoint = '/troupes/' + context.getTroupeId() + '/invites';
      }
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

    afterRender: function() {
      this.collectionView = new CollectionView({
        el: this.$el.find("#invites"),
        collection: this.collection
      }).render();
    },

    onSearchChange: function() {
      var emailField = this.$el.find('#custom-email');

      if(this._prevSearch !== emailField.val()) {
        this._prevSearch = emailField.val();
        this.searchLimited();
      }
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

    onCustomEmailClick: function() {
      var emailField = this.$el.find('#custom-email');
      var email = emailField.val();
      emailField.val('');

      var model = new ContactModel({
        email: email,
        ajaxEndpoint: ajaxEndpoint
      });
      model.invite();

      inviteCollection.unshift(model);
      inviteListView.render();
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
