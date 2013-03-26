/*jshint unused:true, browser:true */
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'views/file/fileView',
  'views/file/fileDetailView',
  'collections/files',
  'views/file/mobileFilePreview',
  'components/unread-items-client'
], function($, _, Backbone, BaseRouter, TroupeViews, FileView, FileDetailView, fileModels, MobileFilePreview/*, unreadItemsClient*/) {
  /*jslint browser: true, unused: true */
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      'file/:id':     'showFile',
      'preview/:id':  'previewFile',
      '*actions':     'defaultAction'
    },

    initialize: function() {
      var self = this;
      this.fileCollection = new fileModels.FileCollection();
      this.fileCollection.listen();
      self.fileCollection.fetch();
    },

    defaultAction: function(/*actions*/){
      var fileView = new FileView({ collection: this.fileCollection });
      this.showView("#primary-view", fileView);
    },

    showFile: function(id) {
      var model = this.fileCollection.get(id);
      var fileDetailView = new FileDetailView({ model: model });
      this.showView("#primary-view", fileDetailView);
    },

    previewFile: function(id) {
      this.showView("#primary-view", new MobileFilePreview({ model: this.fileCollection.get(id) }));
    }

  });


  $('.trpMobileAmuseIcon').click(function() {
    document.location.reload(true);
  });

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

  return troupeApp;
});
