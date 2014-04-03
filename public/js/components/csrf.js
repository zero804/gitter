/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context'
], function($, context) {
  'use strict';

  function applyCsrf(jqxhr, settings) {
    var url = settings.url;
    if(!url) return;

    if(url.indexOf('/') !== 0 && !url.match(/https?:\/\/[\w.-_]*gitter.im\//)) {
      return;
    }

    jqxhr.setRequestHeader('x-access-token', context().accessToken);
  }

  $(document).ajaxSend(function(e, jqxhr, settings) {
    applyCsrf(jqxhr, settings);
  });

  return function beforeSend(jqxhr, settings) {
    applyCsrf(jqxhr, settings);
  };
});