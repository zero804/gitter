'use strict';

const assert = require('assert');
const urlJoin = require('url-join');

const gitterApiBaseUrl = Cypress.env('apiBaseUrl');
assert(gitterApiBaseUrl);

function generateFixtures(fixtureDescription) {
  return fetch(urlJoin(gitterApiBaseUrl, 'private/fixtures'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fixtureDescription)
  }).then(body => body.json());
}

module.exports = generateFixtures;
