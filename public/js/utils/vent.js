/*jshint unused:true browser:true*/
/* Simple event bus for the application */
define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  /*jshint trailing:false */
  /*global require:true console:true setTimeout:true*/
  "use strict";

  var vent = {};
  _.extend(vent, Backbone.Events);

  return vent;
});
