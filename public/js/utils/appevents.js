/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['underscore', 'backbone'], function(_, Backbone) {
  "use strict";


  /*
   * This is the new application-wide message bus. Use it instead of jquery $(document).on(...)
   * As we can use Backbone style listenTo() event listening with it
   */
  var appEvents = {};
  _.extend(appEvents, Backbone.Events);
  return appEvents;

});