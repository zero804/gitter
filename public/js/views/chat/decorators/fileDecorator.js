/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/file/fileDetailView',
  'collections/instances/integrated-items',
], function(FileDetailView, itemCollections) {

  "use strict";

  function showFileDetail(chatItemView, meta) {
    var model = itemCollections.files.get(meta.fileId);
    if (model) {
      var view = new FileDetailView({ model: model, hideClose: true, hideActions: true, className: 'rich' });
      chatItemView.$el.find('.trpChatText').append(view.render().el);
    }
  }

  var decorator = {

    decorate: function(chatItemView) {
      var meta = chatItemView.model.get('meta');
      if (meta) {
        switch (meta.type) {
          case 'file':
            showFileDetail(chatItemView, meta);
            break;
        }
      }
    }

  };

  return decorator;

});
