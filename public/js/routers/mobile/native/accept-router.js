/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'collections/invites',
  'views/invite/inviteModal',
  'components/native-troupe-context', // No ref
  'components/oauth',                 // No Ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, Backbone, context, inviteModels, InviteModal) {
  /*jslint browser: true, unused: true */
  "use strict";

  var AppRouter = Backbone.Router.extend({
    routes: {
      ':inviteId':     'defaultAction'
    },

    initialize: function() {
      this.constructor.__super__.initialize.apply(this);
    },

    defaultAction: function(inviteId){
      var invite = new inviteModels.InviteModel({ id: inviteId });
      invite.url = '/user/' + context.getUserId() + '/invites/' + inviteId;
      invite.fetch();

      var inviteModal = new InviteModal({ model: invite, disableClose: true });
      inviteModal.on('invite:accept', function(data) {
        window.location.assign('chat#' + data.troupeId);
      });

      inviteModal.on('invite:reject', function() {
        window.location.assign('chat');
      });

      inviteModal.show();
    }

  });

  new AppRouter();
  Backbone.history.start();

});
