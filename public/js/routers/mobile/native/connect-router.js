/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'views/shareSearch/shareSearchView',
  'components/realtime',
  'components/oauth',                 // No Ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, Backbone, context, shareSearchView, realtime) {
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
      function openModal() {
        var modal = new shareSearchView.Modal({ disableClose: true, inviteToConnect: true, nativeMode: true });
        modal.show();
      }

      if(context.user().get('url')) {
        openModal();
      } else {
        context.user().on('change', function() {
          openModal();
        });
      }
    }

  });

  new AppRouter();

  Backbone.history.start();

});
