// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./filePreviewView'
], function($, _, Backbone, TroupeViews, template) {
  /*jslint browser: true*/
  /*global window console*/
  "use strict";

  var headerHeight = 110;
  var dialogWidth = 36;

  return TroupeViews.Base.extend({
    template: template,
    events: {
      "click .link-prev": "onLinkPreviousClick",
      "click .link-next": "onLinkNextClick"
    },

    initialize: function(options) {
      var self = this;
      _.bindAll(this, 'onLinkPreviousClick', 'onLinkNextClick', 'modelChange');
      this.navigationController = options.navigationController;
    },

    modelChange: function() {
      console.log("model change");
      var body = this.$el.find('.frame-preview');
      body.empty();

      var data = this.getRenderData();
      console.log(data);
      var el;
      if(data.photo) {
        console.log(">photo");

        el = this.make("img", {"src": data.href, "class": "trpFilePreviewItem" });
      } else if(data.iframe) {
              console.log(">iframe");
        el = this.make("iframe", {"src": data.href, width: "100%", height: "100%", "class": "trpFilePreviewItem" });
      } else {
        console.log(">nothing");
        el = this.make("img", {"src": "/images/2/mime/unknown.png", "class": "trpFilePreviewItem" });
        //el = this.make("p", { }, "No preview available for " + this.model.get('fileName'));
      }

      body.append(el);
    },

    onLinkNextClick: function(e) {
      e.preventDefault();
      var m = this.navigationController.getNext();
      this.model = m;
      this.modelChange();
    },

    onLinkPreviousClick: function(e) {

      e.preventDefault();
      var m = this.navigationController.getPrevious();
      this.model = m;
      this.modelChange();
    },

    getRenderData: function() {
      console.log(">getRenderData", this.model);

      var item = this.model;
      var previewMimeType = item.get('previewMimeType');
      var mimeType = item.get('mimeType');

      if(/^image\//.test(mimeType)) {
        console.log("file is an image");
        return {
          href: item.get('url') + '?embedded=1',
          photo: true
        };
      }

      if(mimeType == 'application/pdf') {
        console.log("file is a pdf");
        return {
          width: "80%",
          height: "80%",
          href:  '/pdfjs/web/viewer.html?file=' + item.get('url') + "?embedded=1",
          iframe: true
        };
      }

      if(/^image\//.test(previewMimeType)) {
                console.log("file has an image preview");
        return {
          href: item.get('embeddedUrl') + '?embedded=1',
          photo: true
        };
      }

      if(previewMimeType == 'application/pdf') {
        console.log("file has a pdf preview");
        return {
          href: '/pdfjs/web/viewer.html?file=' + item.get('embeddedUrl'),
          iframe: true,
          width: "80%",
          height: "80%"
        };
      }

        console.log("file has no preview");

      return {
        noPreviewAvailable: true
      };
    },

    afterRender: function() {
      var body = this.$el.find('.frame-preview');
      var h = Math.round($(window).height() * 0.8)  - headerHeight;
      body.height(h);

      var w= Math.round($(window).width() * 0.8)  - dialogWidth;
      body.width(w);

      this.modelChange();

      return this;
    }
    /*
    render: function() {
      var data = this.getRenderData();
      var el;
      if(data.photo) {
        el = this.make("img", {"src": data.href });
      } else if(data.iframe) {
        el = this.make("iframe", {"src": data.href, width: "500", height: "400"});
      } else if(data.noPreviewAvailable) {
        el = this.make("p", { }, "No preview available.");
      }

      this.$el.append(el);
      return this;
    }
    */
  });

});
