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

function logout() {
  return Promise.all([
      apiClient.web.post('/logout'),
      serviceWorkerDeregistation.uninstall()
    ])
    .spread(function(response) {
      if(response && response.redirect) {
        navigate(response.redirect);
      } else {
        navigate('/');
      }
    })
    .catch(function() {
      navigate('/');
    });
}

module.exports = logout;
