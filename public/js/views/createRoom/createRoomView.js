/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'utils/cdn',
  'hbs!./tmpl/createRoom'
], function($, _, context, TroupeViews, cdn, template) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {

    },

    getRenderData: function() {
      return {

      };
    },

    events: {

    },

    afterRender: function() {


    },

  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
