/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'collections/users',
  'views/people/peopleCollectionView',
  'views/people/personDetailView',
  'components/unread-items-client',
  'template/helpers/all'
], function($, _, Backbone, BaseRouter, userModels, PeopleView, PersonDetailView, unreadItemsClient) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      'person/:id':     'showPerson',
      '*actions':     'defaultAction'
    },

    initialize: function() {
      var userCollection = this.collection = new userModels.UserCollection();
      userCollection.reset(window.troupePreloads['people'], { parse: true });
      userCollection.listen();

      // window.troupePreloads = {};

      // update online status of user models
      $(document).on('userLoggedIntoTroupe', updateUserStatus);
      $(document).on('userLoggedOutOfTroupe', updateUserStatus);

      function updateUserStatus(e, data) {
        var user = userCollection.get(data.userId);
        if (user) {
          // the backbone models have not always come through before the presence events,
          // but they will come with an accurate online status so we can just ignore the presence event
          user.set('online', (data.status === 'in') ? true : false);
        }
      }

      // send out a change event to avatar widgets that are not necessarily connected to a model object.
      userCollection.on('change', function(model) {
        $(document).trigger("avatar:change", model.toJSON());
      });
    },

    defaultAction: function(/* actions */){
      var pplView = new PeopleView({ collection: this.collection });
      this.showView("#primary-view", pplView);
    },

    showPerson: function(id) {
      var pplView = new PersonDetailView({ model: this.collection.get(id) });
      this.showView("#primary-view", pplView);
    }

  });

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });

  return troupeApp;
});
