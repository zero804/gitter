/* jshint unused:true, browser:true, strict:true */
/* global define:false */
define([
  'views/file/fileDetailView',
  // 'log!file-decorator'
], function(FileDetailView/*, log*/) {
  "use strict";

  return function FileDecorator(collection) {

    function showFileDetail(chatItemView, meta) {
      collection.getOrWait(meta.fileId, function(model) {
        var text = chatItemView.$el.find('.trpChatText');
        if (model) {
          var view = new FileDetailView({ model: model, hideClose: true, hideActions: true, className: 'rich' });
          text.append(view.render().el);
        } else {
          text.append("Uploaded a file that has since been deleted.");
        }
      });

    }

    this.decorate = function(chatItemView) {
      var meta = chatItemView.model.get('meta');
      if (meta && meta.type === 'file') {
        showFileDetail(chatItemView, meta);
      }
    };

  };

});
