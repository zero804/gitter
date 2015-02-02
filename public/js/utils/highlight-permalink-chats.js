'use strict';

var itemCollections = require('collections/instances/integrated-items');
var isolateBurst = require('shared/burst/isolate-burst-bb');

module.exports = function highlightPermalinkChats(chatCollectionView, chatId) {
  itemCollections.chats.ensureLoaded(chatId, function(err, model) {
    if (err) return; // Log this?

    if (!model) return;

    var models = isolateBurst(itemCollections.chats, model);
    models.forEach(function(model) {
      var view = chatCollectionView.children.findByModel(model);
      if (view) {
        view.highlight();
      }
    });

    chatCollectionView.scrollToChat(models[0]);
  });
};
