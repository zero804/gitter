/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

// TODO: Better transition to request confirm page
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  './inviteDetailView',
  'hbs!./tmpl/reinviteModal',
  'log!reinvite-modal-view'
], function($, _, context, TroupeViews, InviteDetailView, template, log) {
  "use strict";

  var View = InviteDetailView.extend({
    template: template,

    initialize: function() {
    },

    getRenderData: function() {
      var toUser = this.model.get('user');

      return {
        toUser: (toUser) ? toUser : {
          email: this.model.get('email')
        }
      };
    },

    onResendClicked: function() {
      if (this.dialog) this.dialog.hide();
      InviteDetailView.prototype.onResendClicked.call(this);
    },

    onDeleteClicked: function() {
      if (this.dialog) this.dialog.hide();
      InviteDetailView.prototype.onDeleteClicked.call(this);
    }

  });

  return TroupeViews.Modal.extend({
    initialize: function(options) {

      options.view = new View(options);

      TroupeViews.Modal.prototype.initialize.call(this, options);

    }

  });

});
