// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base'
], function($, _, Backbone, TroupeViews){
  return TroupeViews.Base.extend({
    events: {
      //"click .trpFileActionMenuButton": "showFileActionMenu",
    },

    initialize: function(options) {
      //_.bindAll(this, 'onPreviewLinkClick', 'showFileActionMenu', 'hideFileActionMenu');
    },

    getRenderData: function() {
      var item = this.model;
      var previewMimeType = item.get('previewMimeType');
      var mimeType = item.get('previewMimeType');

      if(/^image\//.test(previewMimeType)) {
        return {
          href: item.get('embeddedUrl') + '?embedded=1',
          photo: true
        };
      }

      if(previewMimeType == 'application/pdf') {
        return {
          href: '/pdfjs/web/viewer.html?file=' + item.get('embeddedUrl'),
          iframe: true,
          width: "80%",
          height: "80%"
        };
      }

      if(/^image\//.test(mimeType)) {
        return {
          href: item.get('url') + '?embedded=1',
          photo: true
        };
      }

      if(mimeType == 'application/pdf') {
        return {
          width: "80%",
          height: "80%",
          href:  '/pdfjs/web/viewer.html?file=' + item.get('url') + "?embedded=1",
          iframe: true
        };
      }

      return {
        noPreviewAvailable: true
      };
    },

    render: function() {
      var data = this.getRenderData();
      var el;
      if(data.photo) {
        el = this.make("img", {"src": data.href });
      } else if(data.iframe) {
        el = this.make("iframe", {"src": data.href, width: "500px", height: "500px"});
      } else if(data.noPreviewAvailable) {
        el = this.make("p", { }, "No preview available.");
      }

      this.$el.append(el);
      return this;
    }

  });

});
