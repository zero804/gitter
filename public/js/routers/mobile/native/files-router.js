/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  'routers/mobile/mobile-router',
  'views/base',
  'views/file/fileView',
  'views/file/fileDetailView',
  'collections/files',
  'views/file/mobileFilePreview',
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, _, Backbone, context, MobileRouter, TroupeViews, FileView, FileDetailView, fileModels, MobileFilePreview) {
  /*jslint browser: true, unused: true */
  "use strict";
  console.log(window.location);
  // TODO: normalise this
  var troupeId = window.location.hash.substring(1);
  context.setTroupeId(troupeId);
  window.location.hash = '';

  console.log('TROUPE ID ', troupeId);

  var troupe = context.troupe();
  troupe.on('change:name', function() {
    console.log('NAME CHANGE!')
    document.title = troupe.get('name');
  });

  var AppRouter = MobileRouter.extend({
    routes: {
      'file/:id':     'showFile',
      'preview/:id':  'previewFile',
      '*actions':     'defaultAction'
    },

    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      this.fileCollection = new fileModels.FileCollection();
      this.fileCollection.listen();
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

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  return troupeApp;
});


