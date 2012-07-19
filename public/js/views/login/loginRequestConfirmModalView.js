// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./loginRequestConfirmModalView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
    },

    events: {

    }

  });

});