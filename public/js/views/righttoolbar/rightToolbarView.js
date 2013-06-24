/*jshint unused:true, browser:true */
define([
  'marionette',
  'hbs!./tmpl/rightToolbar',
  'collections/instances/integrated-items',
  'collections/instances/troupes',
  'views/request/requestView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'views/people/peopleCollectionView'
], function(Marionette, rightToolbarTemplate, itemCollections, troupeCollections, RequestView, FileView, ConversationView, PeopleCollectionView) {
  "use strict";

  return Backbone.Marionette.Layout.extend({
    tagName: "span",
    template: rightToolbarTemplate,

    regions: {
      requests: "#request-roster",
      people: "#people-roster",
      files: "#file-list",
      conversations: "#frame-conversations",
      sidebar: "#right-panel"
    },

    onRender: function() {
      var self = this;

      //this.sidebar.show();

      // reference collections
      var requestCollection = itemCollections.requests;
      var fileCollection = itemCollections.files;
      var conversationCollection = itemCollections.conversations;
      var userCollection = itemCollections.users;

      // Request View
      this.requests.show(new RequestView({ collection: requestCollection }));

      // File View
      this.files.show(new FileView({ collection: fileCollection }));

      // Conversation View
      if (!window.troupeContext.troupe.oneToOne) {
        var conversationView = new ConversationView({
          collection: conversationCollection
        });
        self.conversations.show(conversationView);
      }
      else {
        $('#mail-list').hide();
      }

      // People View
      this.people.show(new PeopleCollectionView({ collection: userCollection }));

    }
  });


});
