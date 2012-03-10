// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/login/login'
], function($, _, Backbone, LoginView){
  var AppRouterLogin = Backbone.Router.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    defaultAction: function(actions){
      var loginView = new LoginView({ router: this });
      loginView.show();
    }
    
  });
  
  return AppRouterLogin;
});
