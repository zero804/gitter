/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'squash',
  'utils/context'
], function(squash, context) {
  "use strict";

  if(context.env('env') != 'dev') {
    squash.configure({
      APIHost: 'https://bugreports.gitter.im',
      APIKey: '1e69adb3-a471-45e2-b09a-ca2ee9d158e6',
      environment: context.env('env'),
      revision: context.env('revision')
    });
  }


});