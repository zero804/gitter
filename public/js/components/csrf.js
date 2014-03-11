/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context'
], function($, context) {
  'use strict';

  $( document ).ajaxSend(function( event, jqxhr ) {
    jqxhr.setRequestHeader('x-access-token', context().accessToken);
  });

});