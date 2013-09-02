/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  'views/base',
  'hbs!./tmpl/shareSearchView',
  'hbs!./tmpl/shareRow',
  'zeroclipboard',
  'utils/appevents',
  'bootstrap-typeahead', // No reference
  'utils/validate-wrapper' // No reference
], function($, _, Backbone, context, TroupeViews, template, rowTemplate, ZeroClipboard, appEvents) {
  "use strict";

  // appEvents.trigger('searchSearchView:select');
  // appEvents.trigger('searchSearchView:success');

var ContactModel = Backbone.Model.extend({
  displayName: '',
  email: '',
  invited: false,
  validate: function(attr) {
    if(!attr.email) {
      return "no email set";
    }
  }
});

var inviteCollection = new Backbone.Collection();

var ContactView = Backbone.View.extend({
    initialize: function(){
      this.listenTo(this.model, 'change', this.render);
    },
    events: {
      'click button': 'invite'
    },
    render: function() {
      this.$el.html(rowTemplate({
        user: this.model.attributes
      }));
      return this;
    },
    invite: function() {
      if(this.model.isValid() && !this.model.get('invited')) {
        $.post('/api/v1/inviteconnections', {
          invites: [{email: this.model.get('email')}]
        });
        this.model.set('invited', true);
      }
    }

});

var CollectionView = Backbone.Marionette.CollectionView.extend({
  itemView: ContactView
});

  // _.extend(ChatCollectionView.prototype, TroupeViews.SortableMarionetteView);


  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      'mouseover #copy-button' : 'createClipboard'
    },

    // when instantiated by default (through the controller) this will reflect on troupeContext to determine what the invite is for.
    //
    initialize: function(options) {

      if(context.inUserhomeContext()) {
        this.shareUrl = context.env('basePath') + '/' + context.getUser().username;
        this.ajaxEndpoint = '/api/v1/inviteconnections';
      } else {
        this.shareUrl = context.env('basePath') + '/' + context.getTroupe().uri;
        this.ajaxEndpoint = '/troupes/' + context.getTroupeId() + '/invites';
      }

      $.getJSON('/contacts?q=', function(data) {
        var array = data.results;
        array.sort(function(a, b) {
          if (a.displayName.toLowerCase() > b.displayName.toLowerCase())
            return 1;
          if (a.displayName.toLowerCase() < b.displayName.toLowerCase())
            return -1;
          // a must be equal to b
          return 0;
        });

        array.forEach(function(contact) {
          var model = new ContactModel({
            displayName: contact.displayName,
            email: contact.email
          });
          inviteCollection.add(model);
        });

        var $invites = $("#invites");

        var inviteListView = new CollectionView({
          el: $invites,
          collection: inviteCollection
        }).render();

        $('#custom-email-button').on('click', function() {
          var email = $('#custom-email').val();
          $('#custom-email').val('');
          $.post('/api/v1/inviteconnections', {
            invites: [{email: email}]
          });
          var model = new ContactModel({email: email});
          model.set('invited', true);

          inviteCollection.unshift(model);
          inviteListView.render();
        });

      });


      // [ { userId: }, or { email: } ]
      this.invites = [];

      if (options && options.overrideContext === true) {
        this.data = {
          inviteToTroupe: options.inviteToTroupe,
          inviteToConnect: options.inviteToConnect,

          troupe: options.troupe ? options.troupe : context.getTroupe(),
          user: options.user ? options.user : context.getUser(),
          importedGoogleContacts: context().importedGoogleContacts

          // , inviteUser: options.inviteUser
        };
      }
      else {
        this.data = {
          inviteToTroupe: context.inTroupeContext() || context.inOneToOneTroupeContext(),
          inviteToConnect: context.inUserhomeContext(),

          troupe: context.getTroupe(),
          user: context.getUser(),
          importedGoogleContacts: context().importedGoogleContacts
        };
      }


      if (this.data.inviteToTroupe && !this.data.troupe) throw new Error("Need a troupe");
      if (this.data.inviteToConnect && !this.data.user) throw new Error("Need a viewer");

      this.data.uri = (this.data.inviteToTroupe) ? this.data.troupe.uri : this.data.user.username;
      this.data.basePath = context.env('basePath');
      this.data.returnToUrl = encodeURIComponent(window.location.pathname + window.location.hash);

      this.addCleanup(function() {
        if(this.clip) this.clip.destroy();
      });
    },

    closeDialog: function() {
      this.dialog.hide();
    },

    createClipboard : function() {
      if(this.clip) return;

      ZeroClipboard.setMoviePath( 'repo/zeroclipboard/ZeroClipboard.swf' );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText( this.shareUrl );
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
