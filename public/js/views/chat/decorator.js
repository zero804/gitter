/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/file/fileDetailView',
  'collections/instances/integrated-items',
  'oEmbed'
], function(FileDetailView, itemCollections, oEmbed) {

  "use strict";

  function showFileDetail(chatItemView, meta) {
    var model = itemCollections.files.get(meta.fileId);
    if (model) {
      var view = new FileDetailView({ model: model, hideClose: true, hideActions: true, className: 'rich' });
      chatItemView.$el.find('.trpChatText').append(view.render().el);
    }
  }

  function embed(chatItemView) {
    oEmbed.defaults.maxwidth = 370;
    chatItemView.$el.find('.link').each(function(index, el) {
      oEmbed.parse(el.href, function(embed) {
        if (embed) {
          $(el).append('<div class="embed">' + embed.html + '</div>');
        }
      });
    });
  }

  var decorator = {

    enrich: function(chatItemView) {
      var meta = chatItemView.model.get('meta');
      if (meta) {
        switch (meta.type) {
          case 'file':
            showFileDetail(chatItemView, meta);
            break;
          case 'user':
            break;
          default:
        }
      }
      embed(chatItemView);
    }

  };

  return decorator;

});
