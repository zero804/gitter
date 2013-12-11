/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/inviteView',
], function($, _, context, TroupeViews, template) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {

    },

    getRenderData: function() {
      return {
        url: context.env('basePath') + context.getTroupe().url
      };
    },

    events: {
      "submit form#updateprofileform": "onFormSubmit",
      "keyup #password": "onPasswordChange",
      "change #password": "onPasswordChange"
    },

    afterRender: function() {


    },

  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Invite others";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
