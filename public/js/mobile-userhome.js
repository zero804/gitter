/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  './mobile-app-container',
  'routers/userhome-router',
  'views/userhome/userHomeView',
  'components/modal-region'
  ], function(app, UserhomeRouter, UserHomeView, modalRegion) {
  "use strict";

  app.addInitializer(function() {
    document.getElementById('chat-amuse').style.display = 'none';

    new UserhomeRouter({
      regions: [null, modalRegion]
    });

  });
  app.content.show(new UserHomeView());
  app.start();
});
