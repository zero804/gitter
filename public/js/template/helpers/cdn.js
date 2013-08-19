/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/cdn',
  'handlebars'
], function (cdn, Handlebars ) {
  "use strict";

  Handlebars.registerHelper( 'cdn', cdn);
});
