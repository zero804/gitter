'use strict';

module.exports = function loginRoutes(){
  return {
    'login': function(){
      var dialogRegion = this.dialogRegion;
      require.ensure(['../views/modals/login-view'], function(require){
        var LoginView = require('../views/modals/login-view');
        dialogRegion.show(new LoginView());
      });
    }
  }
}
