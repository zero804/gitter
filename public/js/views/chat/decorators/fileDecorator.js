/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/file/fileDetailView',
  'collections/instances/integrated-items',
  'log!file-decorator'
], function(FileDetailView, itemCollections, log) {

  "use strict";

  function showFileDetail(chatItemView, meta) {
    var model = itemCollections.files.get(meta.fileId);
    log('File model: ', model);
    if (model) {
      log('File model found');
      var view = new FileDetailView({ model: model, hideClose: true, hideActions: true, className: 'rich' });
      log('chatText el: ', chatItemView.$el.find('.trpChatText'));
      log('fileDetail view el: ', view.render().el);
      chatItemView.$el.find('.trpChatText').append(view.render().el);
    }
  }

  var decorator = {

    decorate: function(chatItemView) {
      log('Running fileDecorator', meta);
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
