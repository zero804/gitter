/*jshint unused:true, browser:true */
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'collections/users',
  'marionette',
  'views/base',
  'hbs!./views/people/tmpl/mobilePeopleView',
  'components/unread-items-client',
  'template/helpers/all'
], function($, _, Backbone, BaseRouter, userModels, Marionette, TroupeViews, PersonViewTemplate/*, unreadItemsClient*/) {
  /*jslint browser: true, unused: true */
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      '*actions':     'defaultAction'
    },

    initialize: function() {
      var userCollection = this.collection = new userModels.UserCollection();
      userCollection.reset(window.troupePreloads['people'], { parse: true });
      userCollection.listen();
      if (window.noupdate) {
        this.collection.fetch();
      }

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
      this.showView("#primary-view", new Marionette.CollectionView({
        collection: this.collection,
        itemView: TroupeViews.Base.extend({
          template: PersonViewTemplate,
          getRenderData: function() {
            var d = this.model.toJSON();
            if (window.troupeContext.user.id === this.model.id) {
              d.isSelf = true;
            }
            return d;
          }
        })
      }));
    }

  });

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

  return troupeApp;
});
