/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'components/csrf'                             // No ref
], function(AppIntegratedView, UserHomeView) {

  "use strict";

  new AppIntegratedView();

  new UserHomeView({ el: '#content-wrapper' }).render();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });
});
