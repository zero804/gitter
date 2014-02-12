/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context'
], function($, context) {
  'use strict';

  $.ajaxSetup({
    headers: {
      'x-access-token': context().accessToken
    }
  });

});