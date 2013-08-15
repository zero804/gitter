require([
  'backbone',
  './mobile-app-container',
  'utils/router',
  'views/shareSearch/shareSearchView',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'collections/instances/troupes',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/invite/reinviteModal',
  'components/modal-region'
  ], function(Backbone, app, Router, shareSearchView, AppIntegratedView, UserHomeView, troupeCollections, profileView, createTroupeView, InviteModal, modalRegion) {
  app.addInitializer(function() {
    document.getElementById('chat-amuse').style.display = 'none';

    new Router({
      routes: [
        { name: "profile",  re: /^profile$/,         viewType: profileView.Modal },
        { name: "create",   re: /^create$/,          viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
        { name: "share",    re: /^share$/,           viewType: shareSearchView.Modal },
        { name: "reinvite", re: /^reinvite\/(\w+)$/, viewType: InviteModal,                  collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
        { name: "connect",  re: /^connect$/,         viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } }
      ],
      regions: [null, modalRegion]
    });
  });
  app.content.show(new UserHomeView());
  app.start();
});
