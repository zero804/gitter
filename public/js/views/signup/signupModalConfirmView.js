// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./signupModalConfirmView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template
  });

});