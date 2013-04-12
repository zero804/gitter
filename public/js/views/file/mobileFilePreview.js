/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/mobileFilePreview'
], function($, _, Backbone, TroupeViews, template) {
  /*jslint browser: true*/
  "use strict";

  return TroupeViews.Base.extend({

    initialize: function(options) {
      this.model = options.model;
    },

    render: function() {
      // var previewMimeType = this.model.get('previewMimeType');
      var mimeType = this.model.get('mimeType');

      // TODO this is failing on mobile for zip files. Use the default icon or show a message.
      var data = {
        previewUrl: this.model.get('url') + '?embedded=1'
      };

      if(/^image\//.test(mimeType)) {
        data.photo = true;
      }

      this.$el.html(template(data));

      var body = $(document);
      var iframe = this.$el.find('iframe');
      iframe.css({ width: body.width(), height: body.height() });

      return this;
    }

  });

});