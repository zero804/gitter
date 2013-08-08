/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  'routers/mobile/mobile-router',
  'collections/users',
  'marionette',
  'views/base',
  'hbs!views/people/tmpl/mobilePeopleView',
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, _, Backbone, context, MobileRouter, userModels, Marionette, TroupeViews, PersonViewTemplate) {
  /*jslint browser: true, unused: true */
  "use strict";

  // TODO: normalise this
  var troupeId = window.location.hash.substring(1);
  context.setTroupeId(troupeId);
  window.location.hash = '';

  var AppRouter = MobileRouter.extend({
    routes: {
      '*actions':     'defaultAction'
    },

    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      var userCollection = this.collection = new userModels.UserCollection();
      userCollection.listen();

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
            if (context.getUserId() === this.model.id) {
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

  return troupeApp;
});
