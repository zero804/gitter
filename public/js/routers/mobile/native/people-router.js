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
  'views/shareSearch/shareSearchView',
  'components/native-troupe-context',       // No ref
  'components/oauth',                       // No Ref
  'components/eyeballs',                    // No ref
  'template/helpers/all',                   // No ref
  'components/native-context'               // No ref
], function($, _, Backbone, context, MobileRouter, userModels, Marionette,
    TroupeViews, PersonViewTemplate, shareSearchView) {

  /*jslint browser: true, unused: true */
  "use strict";

  var AppRouter = MobileRouter.extend({
    routes: {
      'share':      'shareAction',
      '*actions':   'defaultAction'
    },

    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      var userCollection = this.collection = new userModels.UserCollection();
      userCollection.listen();

      this.userCollection = userCollection;

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

    shareAction: function() {
      var self = this;
      function openModal() {
        var modal = new shareSearchView.Modal({ disableClose: false, inviteToConnect: false });
        modal.show();
        modal.once('hide', function() {
          // Only the first user in here
          if(self.userCollection.length === 1) {
            window.location.href="chat";
          }
        });

      }

      if(context.troupe().get('url')) {
        openModal();
      } else {
        context.troupe().on('change', function() {
          openModal();
        });
      }


    },

    defaultAction: function(/* actions */){
      this.show('primary', new Marionette.CollectionView({
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
