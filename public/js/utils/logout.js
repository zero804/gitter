"use strict";

var apiClient = require('../components/api-client');
var serviceWorkerDeregistation = require('gitter-web-service-worker/browser/deregistration');
var Promise = require('bluebird');

function navigate(href) {
  try {
    window.parent.location.href = href;
  } catch(e) {
    window.location.href = href;
  }
}

function logout(forcedRedirect) {
  return Promise.all([
      apiClient.web.post('/logout'),
      serviceWorkerDeregistation.uninstall()
    ])
    .spread(function(response) {
      if(forcedRedirect) {
        navigate(forcedRedirect);
      } else if(response && response.redirect) {
        navigate(response.redirect);
      } else {
        navigate('/');
      }
    })
    .catch(function() {
      if(forcedRedirect) {
        navigate(forcedRedirect);
      } else {
        navigate('/');
      }
    });
}

module.exports = logout;
