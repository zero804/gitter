/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'fineuploader',
  'hbs!./tmpl/rightToolbar',
  'collections/instances/integrated-items',
  'views/request/requestView',
  'views/invite/inviteView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'views/people/peopleCollectionView'
], function($, Backbone, context, qq, rightToolbarTemplate, itemCollections, RequestView, InviteView, FileView, ConversationView, PeopleCollectionView) {
  "use strict";

  return Backbone.Marionette.Layout.extend({
    tagName: "span",
    template: rightToolbarTemplate,

    regions: {
      requests: "#request-roster",
      invites: "#invite-roster",
      people: "#people-roster",
      files: "#file-list",
      conversations: ".frame-conversations"
    },

    events: {
      "click #people-header": "onPeopleHeaderClick",
      "click #request-header": "onRequestHeaderClick",
      "click #invites-header": "onInvitesHeaderClick",
      "click #file-header": "onFileHeaderClick",
      "click #mail-header": "onMailHeaderClick"
    },

    initialize: function() {
      this.model = new Backbone.Model({
        troupeEmailAddress: context().troupeUri + '@' + context.env('baseServer'),
        isOneToOne: context.getTroupe().oneToOne
      });
    },

    onRender: function() {
      var self = this;

      $('#toolbar-frame').show();
      $('#right-panel').show();

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
                window.location.href = "#file/" + response.file.id;
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

      // Conversation View
      if (context.inOneToOneTroupeContext()) {
        var conversationView = new ConversationView({
          collection: conversationCollection
        });
        self.conversations.show(conversationView);
      } else {
        $('#mail-list').hide();
      }

      // People View
      this.people.show(new PeopleCollectionView({ collection: userCollection }));

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


});