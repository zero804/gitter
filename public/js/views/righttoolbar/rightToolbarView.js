/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'marionette',
  'views/base',
  'utils/context',
  'fineuploader',
  'hbs!./tmpl/rightToolbar',
  'collections/instances/integrated-items',
  'collections/instances/troupes',
  'views/request/requestView',
  'views/invite/inviteView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'views/people/peopleCollectionView',
  'cocktail',
  'utils/uservoice',
  'views/widgets/troupeAvatar'
], function($, Backbone, Marionette, TroupeViews, context, qq, rightToolbarTemplate, itemCollections,
   trpCollections, RequestView, InviteView, FileView, ConversationView, PeopleCollectionView, cocktail, userVoice, TroupeAvatar) {
  "use strict";

  var RightToolbarLayout = Marionette.Layout.extend({
    tagName: "span",
    template: rightToolbarTemplate,

    regions: {
      requests: "#request-roster",
      invites: "#invite-roster",
      people: "#people-roster",
      files: "#file-list",
      conversations: ".frame-conversations",
      troupeAvatar: "#troupe-avatar-region"
    },

    events: {
      // "click #people-header": "onPeopleHeaderClick",
      // "click #request-header": "onRequestHeaderClick",
      // "click #invites-header": "onInvitesHeaderClick",
      // "click #file-header": "onFileHeaderClick",
      // "click #mail-header": "onMailHeaderClick"
      "click #favourite-button":        "toggleFavourite",
      "click #help-button":              "onHelpClicked" 
    },

    initialize: function() {
      this.model = new Backbone.Model({
        troupeEmailAddress: context().troupeUri + '@' + context.env('baseServer'),
        isOneToOne: context.getTroupe().oneToOne
      });

      var self = this;

      trpCollections.troupes.on('change:name', function(model) {
        if (model.id == context.getTroupeId()) {
          self.updateHeader(model.get('name'));
        }
      });

      this.updateHeader(context.getTroupe().name);


    },

    updateHeader: function(value) {
      // header title
      $('#people-header').text(value);
    },

    serializeData: function() {
      var user = context.getUser();
      var troupe = context.getTroupe();
      return {
        headerTitle: troupe && troupe.name || user.displayName,
        isTroupe: !!troupe,
        oneToOne: context.inOneToOneTroupeContext(),
        user: user,
        favourite: troupe && troupe.favourite,
        troupeAvatarUrl: troupe && troupe.avatarUrl,
        troupeName: troupe && troupe.name,
        troupe: troupe
      };

    },

    onRender: function() {

      $('#toolbar-frame').show();
      $('#right-panel').show();

      userVoice.install(this.$el.find('#help-button'), context.getUser());
      this.uploader = new qq.FineUploader({
        element: this.$el.find('#fineUploader')[0],
        dragAndDrop: {
          extraDropzones: [$('body')[0]],
          hideDropzones: false,
          disableDefaultDropzone: false
        },
        text: {
          dragZone: '', // text to display
          dropProcessing: '',
          waitingForResponse: '',
          uploadButton: ''
        },
        request: {
          endpoint: '/troupes/' + context.getTroupeId() + '/downloads/'
        },
        callbacks: {
          onComplete: function(id, fileName, response) {
            var model;

            if(response.success) {
              fileCollection.add(response.file, { merge: true });

              model = fileCollection.get(response.file.id);
              model.on('change', onChange);
            }

            function onChange() {
              var versions = model.get('versions');
              var hasThumb = versions.at(versions.length - 1).get('thumbnailStatus') !== 'GENERATING';
              if (hasThumb) {
                model.off('change', onChange);
              }
            }
          }
        }
      });

      //this.sidebar.show();

      // reference collections
      var requestCollection = itemCollections.requests;
      var invitesCollection = itemCollections.invites;
      var fileCollection = itemCollections.files;
      var conversationCollection = itemCollections.conversations;
      var userCollection = itemCollections.users;

      // Request View
      this.requests.show(new RequestView({ collection: requestCollection }));

      // Invites View
      this.invites.show(new InviteView({ collection: invitesCollection }));

      // File View
      this.files.show(new FileView({ collection: fileCollection }));


      if (!context.inOneToOneTroupeContext()) {
        this.troupeAvatar.show(new TroupeAvatar({ troupe: context.troupe(), noHref: true, noUnred: true}));
      }
      // Conversation View
      if (!context.inOneToOneTroupeContext()) {
        this.conversations.show(new ConversationView({
          collection: conversationCollection
        }));
      } else {
        $('#mail-list').hide();
      }

      // People View
      this.people.show(new PeopleCollectionView({ collection: userCollection }));

      this.initHideListeners();
    },

    initHideListeners: function() {
      var self = this;

      toggler('#invite-list', itemCollections.invites);
      toggler('#invite-header', itemCollections.invites);
      toggler('#request-header', itemCollections.requests);
      toggler('#request-list', itemCollections.requests);

      function toggler(element, collection) {
        function toggle() {
          self.$el.find(element).toggle(collection.length > 0);
        }

        collection.on('all', toggle);
        toggle();
      }
    },

    toggleFavourite: function() {
      var favHeader = $('.trpTroupeFavourite');
      favHeader.toggleClass('favourited');
      var isFavourite = favHeader.hasClass('favourited');

      $.ajax({
        url: '/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });

      // The update should happen automatically via a patch operation....
      //window.troupeContext.troupe.favourite = isFavourite;
      //var troupe = collections.troupes.get(window.troupeContext.troupe.id);
      //troupe.set('favourite', isFavourite);
    },

    onHelpClicked: function() {

    },

    onMailHeaderClick: function() {
      this.toggleMails();
    },

    onFileHeaderClick: function() {
      this.toggleFiles();
    },

    onRequestHeaderClick: function() {
      this.toggleRightPanel('request-list');
    },

    onInvitesHeaderClick: function() {
      this.toggleRightPanel('invites-list');
    },

    onPeopleHeaderClick: function() {
      this.toggleRightPanel('people-roster');
    },

    onAddPeopleClick: function() {
    },

    toggleRightPanel: function(id) {
      $('#'+id).slideToggle(350);
    },

    toggleFiles: function () {
      $("#file-list").slideToggle(350);
      $("#fineUploader").toggle();
    },

    toggleMails: function () {
      $("#mail-list").slideToggle(350);
    }

  });
  cocktail.mixin(RightToolbarLayout, TroupeViews.DelayedShowLayoutMixin);

  return RightToolbarLayout;

});