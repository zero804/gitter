// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/login/loginModalView',
  'views/profile/profileModalView'
], function($, _, Backbone, TroupeViews, LoginModalView, ProfileModalView) {
  return Backbone.Router.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    defaultAction: function(actions) {
      $('#primary-view').html('');
      var view, modal;
      if(!window.troupeContext.user) {
        view = new LoginModalView();
        modal = new TroupeViews.Modal({ view: view, disableClose: true });
        view.on('login.complete', function(data) {
          modal.off('login.complete');

          window.location.href="/" + data.defaultTroupe.uri;
        });

        modal.show();
      }

      if(window.troupeContext.profileNotCompleted) {
        view = new ProfileModalView();
        modal = new TroupeViews.Modal({ view: view });
        modal.show();
      }
    }

  });
});
