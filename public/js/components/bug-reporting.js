/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'raven',
  'utils/context'
], function(Raven, context) {
  "use strict";

  if(context.env('env') != 'dev') {
    Raven.config('***REMOVED***', {
        // # we highly recommend restricting exceptions to a domain in order to filter out clutter
        // whitelistUrls: ['example.com/scripts/']
    }).install();

    var user = context.user();
    Raven.setUser({
      username: user && user.get('username')
    });
  }


});