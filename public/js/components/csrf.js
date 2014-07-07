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

    var accessToken = context.getAccessToken();
    if(accessToken) {
      jqxhr.setRequestHeader('x-access-token', accessToken);
    }

    var bearerToken = context.getBearerToken();
    if(bearerToken) {
      jqxhr.setRequestHeader('Authorization', 'Bearer '+bearerToken);
    }
  }

  $(document).ajaxSend(function(e, jqxhr, settings) {
    applyCsrf(jqxhr, settings);
  });

  return function beforeSend(jqxhr, settings) {
    applyCsrf(jqxhr, settings);
  };
});
