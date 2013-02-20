/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/versionView'
], function($, _, Backbone, TroupeViews, template){
  return TroupeViews.Base.extend({
    template: template,

    events: {
    },

    initialize: function(options) {
      this.file = options.file;
      this.versionNumber = this.file.get('versions').indexOf(this.model);
      this.versionUrl = this.file.get('url') + '?version=' + this.versionNumber;
    },

    afterRender: function() {
    },

    beforeClose: function() {
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.url = this.versionUrl;
      data.createdDate = data.createdDate ? data.createdDate.calendar() : null;
      return data;
    }

  });
});
