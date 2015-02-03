'use strict';

var isolateBurst = require('shared/burst/isolate-burst-bb');

module.exports = function highlightPermalinkChats(chatCollectionView, chatId) {
  var chatCollection = chatCollectionView.collection;
  chatCollection.ensureLoaded(chatId, function(err, model) {
    if (err) return; // Log this?

    if (!model) return;

    var models = isolateBurst(chatCollection, model);
    models.forEach(function(model) {
      var view = chatCollectionView.children.findByModel(model);
      if (view) {
        view.highlight();
      }
    });

    chatCollectionView.scrollToChat(models[0]);
  });
};
