'use strict';

const assert = require('assert');
const urlJoin = require('url-join');
const $ = require('jquery');

const gitterApiBaseUrl = Cypress.env('apiBaseUrl');
assert(gitterApiBaseUrl);

function generateFixtures(fixtureDescription) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: urlJoin(gitterApiBaseUrl, 'private/fixtures'),
      method: 'POST',
      data: JSON.stringify(fixtureDescription),
      contentType: 'application/json',
      // 60 second timeout
      timeout: 60 * 1000,
      success: function(data) {
        resolve(data);
      },
      error: function(xhr, textStatus, errorThrown) {
        reject(errorThrown);
      }
    });
  });
}

module.exports = generateFixtures;
