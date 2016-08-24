"use strict";

var apiClient = require('../components/apiClient');

function navigate(href) {
  try {
    window.parent.location.href = href;
  } catch(e) {
    window.location.href = href;
  }
}

module.exports = function logout() {
  return apiClient.web.post('/logout')
    .then(function(response) {
      if(response && response.redirect) {
        navigate(response.redirect);
      } else {
        navigate('/');
      }
    })
    .catch(function() {
      navigate('/');
    });

};
