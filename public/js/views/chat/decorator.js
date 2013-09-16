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

  function showNotificationIcon(chatItemView, meta) {
    var favicon;
    switch (meta.service) {
      case 'github':
        favicon = 'https://github.com/favicon.ico';
        break;
      case 'bitbucket':
        favicon = 'https://bitbucket.org/favicon.ico';
        break;
      case 'jenkins':
        favicon = 'https://jenkins-ci.org/sites/default/files/jenkins_favicon.ico';
        break;
      case 'sprintly':
        favicon = 'https://sprint.ly/favicon.ico';
        break;
    }

    var iconHtml = '<div class="notification-icon"><a href="'+ meta.url +'"><img src="' + favicon  + '"></a></div>';
    chatItemView.$el.find('.trpChatText').prepend(iconHtml);
  }

  function showAvatar(chatItemView, meta) {
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
          case 'webhook':
            showNotificationIcon(chatItemView, meta);
            break;
          case 'user':
            showAvatar(chatItemView, meta);
            break;
          default:
        }
      }
      embed(chatItemView);
    }

  };

  return decorator;

});
