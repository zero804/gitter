// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./signupModalView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template
  });

});