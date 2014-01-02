/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  Handlebars.registerHelper('breaklines', function(text) {
      text = Handlebars.Utils.escapeExpression(text);
      text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
      return new Handlebars.SafeString(text);
  });

});
