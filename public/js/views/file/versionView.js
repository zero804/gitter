// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'dateFormat',
  'hbs!./versionView'
], function($, _, Backbone, TroupeViews, dateFormat, template){
  return TroupeViews.Base.extend({
    template: template,

    events: {
    },

    initialize: function(options) {
    },

    afterRender: function() {
    },

    beforeClose: function() {
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      // TODO Date.parse doesn't work in loads of browsers
      data.createdDate = Date.parse(data.createdDate);
      var d = new Date(data.createdDate);
      data.createdDate = d.toUTCString();
      var now = new Date();
      if (now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()) {
        data.createdDate = d.format('h:MM TT');
      }
      else {
        data.createdDate = d.format('mmmm d');
      }
      return data;
    }

  });
});
