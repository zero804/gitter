require([
  'jquery',
  'backbone',
  'utils/context',
  'views/app/chatIntegratedView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',
  'views/righttoolbar/rightToolbarView',

  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/headerView',

  'views/people/peopleCollectionView',

  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/bug-reporting',   // No ref
  'components/ajax-errors'      // No ref

], function($, Backbone, context,
    ChatIntegratedView,
    ChatCollectionView, itemCollections, RightToolbarView,
    webhookDecorator, issueDecorator, commitDecorator, mentionDecorator,
    embedDecorator, emojiDecorator, HeaderView, peopleCollectionView) {
  "use strict";

  $(document).on("click", "a", function(e) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.indexOf('#') === 0) {
        e.preventDefault();
        window.location = href;
      }
    }

    return true;
  });


  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on("click", "a.link", function(e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    if(!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

  var appView = new ChatIntegratedView({ el: 'body' });
  new RightToolbarView({ el: "#toolbar-frame" });

  new HeaderView({ model: context.troupe(), el: '#header' });

  new ChatCollectionView({
    el: '#chat-container',
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorators: [
      webhookDecorator,
      issueDecorator,
      commitDecorator,
      mentionDecorator,
      embedDecorator,
      emojiDecorator
    ]
  }).render();


  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
      "people": "people",
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

    people: function() {
      appView.dialogRegion.show(new peopleCollectionView.Modal({ collection: itemCollections.sortedUsers }));
    },

  });

  new Router();

  // // Listen for changes to the room
  // liveContext.syncRoom();

  Backbone.history.start();
});
