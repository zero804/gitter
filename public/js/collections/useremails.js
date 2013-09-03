/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  './base'
], function($, _, Backbone, context, TroupeCollections) {
  "use strict";

  var exports = {};

  exports.UserEmailModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  exports.UserEmailCollection = TroupeCollections.LiveCollection.extend({
    model: exports.UserEmailModel,
    modelName: 'useremail',
    url: function() {
      return "/user/" + context.getUserId() + "/emails";
    }
  });

  return exports;

});
