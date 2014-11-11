"use strict";
var $ = require('jquery');
var Backbone = require('backbone');
var context = require('utils/context');
var ChatIntegratedView = require('views/app/chatIntegratedView');
var ChatCollectionView = require('views/chat/chatCollectionView');
var itemCollections = require('collections/instances/integrated-items');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');
var webhookDecorator = require('views/chat/decorators/webhookDecorator');
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var embedDecorator = require('views/chat/decorators/embedDecorator');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var HeaderView = require('views/app/headerView');
var peopleCollectionView = require('views/people/peopleCollectionView');
require('views/widgets/preload');
require('filtered-collection');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');

module.exports = (function() {


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

})();

