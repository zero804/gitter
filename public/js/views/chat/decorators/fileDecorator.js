/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/file/fileDetailView',
  'log!file-decorator'
], function(FileDetailView, log) {
  "use strict";

  return function FileDecorator(collection) {

    function showFileDetail(chatItemView, meta) {
      collection.getOrWait(meta.fileId, function(model) {
        log('File model: ', model);
        if (model) {
          log('File model found');
          var view = new FileDetailView({ model: model, hideClose: true, hideActions: true, className: 'rich' });
          log('chatText el: ', chatItemView.$el.find('.trpChatText'));
          log('fileDetail view el: ', view.render().el);
          chatItemView.$el.find('.trpChatText').append(view.render().el);
        } else {
          chatItemView.$el.find('.trpChatText').append("Uploaded a file that has since been deleted.");
        }
      });

    }

    this.decorate = function(chatItemView) {
      log('Running fileDecorator', meta);
      var meta = chatItemView.model.get('meta');
      if (meta) {
        switch (meta.type) {
          case 'file':
            showFileDetail(chatItemView, meta);
            break;
        }
      }
    };

  };

});
