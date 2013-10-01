/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'collections/troupes',
  'views/signup/createTroupeView',
  'components/realtime',
  'components/oauth',                 // No ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, Backbone, context, troupeModels, createTroupeView, realtime) {
  /*jslint browser: true, unused: true */
  "use strict";

  // We have to do this so that the context gets populated
  // At some stage we should generalise this
  realtime.getClient();

  var AppRouter = Backbone.Router.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    initialize: function() {
      this.constructor.__super__.initialize.apply(this);
    },

    defaultAction: function(){
      var troupeCollection = new troupeModels.TroupeCollection();

      var modal = new createTroupeView.Modal({ disableClose: true, collection: troupeCollection, nativeMode: true, hideHeader: true });

      modal.show();
    }

  });

  new AppRouter();

  Backbone.history.start();

});
