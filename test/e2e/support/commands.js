'use strict';

const assert = require('assert');
const urlJoin = require('url-join');

const gitterBaseUrl = Cypress.env('baseUrl');
assert(gitterBaseUrl);
const gitterApiBaseUrl = Cypress.env('apiBaseUrl');
assert(gitterApiBaseUrl);

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('login', user => {
  cy.log(`Logging in as user ${user.username} -> ${user.accessToken}`);
  cy.request({
    url: gitterBaseUrl,
    method: 'GET',
    body: {
      access_token: user.accessToken
    }
  }).then(res => {
    assert.equal(res.status, 200);
  });
});

Cypress.Commands.add('toggleFeature', (featureName, force) => {
  cy.log(`Toggling feature toggle ${featureName}: ${force}`);
  // Make sure the feature toggle already exists
  cy.request({
    url: urlJoin(gitterApiBaseUrl, 'private/fixtures'),
    method: 'POST',
    body: {
      featureToggle1: { name: featureName }
    }
  });

  // Then toggle the feature
  cy.request({
    url: urlJoin(gitterBaseUrl, '/api_web/features/', featureName, force ? '1' : '0'),
    method: 'GET'
  })
    .its('body')
    .then(body => {
      assert.equal(body.status, 200);
      assert.equal(body.action, force);
    });
});
