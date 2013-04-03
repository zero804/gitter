/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/filePreviewView'
], function($, _, Backbone, TroupeViews, template) {
  /*jslint browser: true*/
  "use strict";

  var headerHeight = 110;
  var dialogWidth = 36;

  function detectAdobeReader() {
    try {
      if(window.ActiveXObject) {
        var control = null;

        //
        // load the activeX control
        //
        try {
          // AcroPDF.PDF is used by version 7 and later
          control = new ActiveXObject('AcroPDF.PDF');
        } catch(e) {}

        if(!control) {
          try {
            // PDF.PdfCtrl is used by version 6 and earlier
            control = new ActiveXObject('PDF.PdfCtrl');
          } catch(e) {}
        }

        return !!control;
      }

      if(navigator.plugins['Adobe Acrobat']) {
        return true;
      }

      for(var key in navigator.plugins) {
        if(navigator.plugins[key].name == "Chrome PDF Viewer" || navigator.plugins[key].name == "Adobe Acrobat") {
          return true;
        }
      }

    } catch(e) {
      return false;
    }

    return false;
  }

  /** If a PDF plugin is installed, use it directly */
  function pdfViewUrl(url) {
    if(detectAdobeReader()) {
      return url + "?embedded=1";
    } else {
      return '/pdfjs/web/viewer.html?file=' + url + "?embedded=1";
    }
  }
  var displayDirectMimeTypes = {
    'image/jpeg': true,
    'image/gif': true,
    'image/png': true
  };

  var PreviewView = TroupeViews.Base.extend({
    template: template,
    events: {
    },

    keys: {
      'right': 'showNext',
      'left': 'showPrev'
    },

    initialize: function() {
      _.bindAll(this, 'onMenuItemClicked');
      this.on('menuItemClicked', this.onMenuItemClicked);
    },

    showNext: function() {
      this.$el.find('a.link-next').click();
    },

    showPrev: function() {
      this.$el.find('a.link-prev').click();
    },

    onMenuItemClicked: function() {
      window.location.href = this.model.get("url");
    },

    supportsModelReplacement: function() {
      return true;
    },

    replaceModel: function(model) {
      this.model = model;
      this.onModelChange();
    },

    onModelChange: function() {
      var body = this.$el.find('.frame-preview');
      body.empty();

      var data = this.getRenderData();
      var el;
      if(data.photo) {
        el = $('<img src="' + data.href + '" class="trpFilePreviewItem" />');
      } else if(data.iframe) {
        el = $('<iframe src="' + data.href + '" width="100%" height="100%" class="trpFilePreviewItem">');
      } else {
        el = $('<img src="/images/2/mime/unknown.png" class="trpFilePreviewItem"/>');
      }

      var prev = this.getPreviewLinkUrl(this.getPrevious());
      var next = this.getPreviewLinkUrl(this.getNext());
      this.$el.find('a.link-prev').attr('href', prev)[prev ? 'show' : 'hide']();
      this.$el.find('a.link-next').attr('href', next)[next ? 'show' : 'hide']();

      body.append(el);
    },

    getNext: function() {
      var i = this.collection.indexOf(this.model);
      if(i < this.collection.length - 1) {
        return this.collection.at(i + 1);
      }

      return null;
    },

    getPrevious: function() {
      var i = this.collection.indexOf(this.model);
      if(i > 0) {
        return this.collection.at(i - 1);
      }
      return null;
    },

    getPreviewLinkUrl: function(model) {
      if(!model) return null;
      return "#|#file/preview/" + model.id;
    },

    getRenderData: function() {
      var item = this.model;
      var previewMimeType = item.get('previewMimeType');
      var mimeType = item.get('mimeType');

      if (typeof console != "undefined") console.log("WHAT AM I: " + mimeType);
      if(displayDirectMimeTypes[mimeType]) {
        return {
          href: item.get('url') + '?embedded=1',
          photo: true
        };
      }

      if(mimeType == 'application/pdf') {
        return {
          width: "80%",
          height: "80%",
          href:  pdfViewUrl(item.get('url')),
          iframe: true
        };
      }

      if(/^image\//.test(previewMimeType)) {
        return {
          href: item.get('embeddedUrl') + '?embedded=1',
          photo: true
        };
      }

      if(previewMimeType == 'application/pdf') {
        return {
          href:  pdfViewUrl(item.get('embeddedUrl')),
          iframe: true,
          width: "80%",
          height: "80%"
        };
      }

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

      this.onModelChange();

      return this;
    }
  });

  var Modal = TroupeViews.Modal.extend({
    className: 'modal trpFilePreview',
    menuItems: [{
      id: "download",
      text: "Download"
    }],
    initialize: function(options) {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new PreviewView({ model: this.model, collection: this.collection });
    }
  });

  return {
    Modal: Modal,
    PreviewView: PreviewView
  };

});
