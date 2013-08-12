require([
  './mobile-app-container',
  'views/userhome/userHomeView'
  ], function(app, UserHomeView) {
  app.content.show(new UserHomeView());
  app.start();
  document.getElementById('chat-amuse').style.display = 'none';
});
