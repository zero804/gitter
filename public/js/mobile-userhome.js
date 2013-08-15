require([
  'backbone',
  './mobile-app-container',
  'views/userhome/userHomeView',
  'utils/router',
  'views/shareSearch/shareSearchView',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'collections/instances/troupes',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/invite/reinviteModal'
  ], function(Backbone, app, UserHomeView, Router, shareSearchView, AppIntegratedView, UserHomeView, troupeCollections, profileView, createTroupeView, InviteModal) {
  app.addInitializer(function() {
    document.getElementById('chat-amuse').style.display = 'none';
    var dialogRegion = {
      currentView: null,
      show: function(view) {
        if(this.currentView) {
          this.currentView.fade = false;
          this.currentView.hideInternal();
        }
        this.currentView = view;
        view.navigable = true;
        view.show();
      },
      close: function() {
        if(this.currentView) {
          this.currentView.navigationalHide();
          this.currentView = null;
        }
      }
    };
    new Router({
      routes: [
        { name: "profile",  re: /^profile$/,         viewType: profileView.Modal },
        { name: "create",   re: /^create$/,          viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
        { name: "share",    re: /^share$/,           viewType: shareSearchView.Modal },
        { name: "reinvite", re: /^reinvite\/(\w+)$/, viewType: InviteModal,                  collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
        { name: "connect",  re: /^connect$/,         viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } }
      ],
      regions: [null, dialogRegion]
    });
  });
  app.content.show(new UserHomeView());
  app.start();
});
