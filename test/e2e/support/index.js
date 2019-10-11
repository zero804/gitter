'use strict';

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// cypress/support/index.js
require('cypress-failed-log');

// Alternatively you can use CommonJS syntax:
require('./commands');

let logs = '';

Cypress.on('window:before:load', win => {
  Cypress.log({
    name: 'console.log',
    message: 'wrap on console.log'
  });

  // pass through cypress log so we can see log inside command execution order
  win.console.log = (...args) => {
    Cypress.log({
      name: 'console.log',
      message: args
    });
  };
});

Cypress.on('log:added', options => {
  if (options.instrument === 'command') {
    const message = `${(options.displayName || options.name || '').toUpperCase()} ${
      options.message
    }`;
    logs += `${message}\n`;
    // eslint-disable-next-line no-console
    console.log(message);
  }
});

// On a cypress fail. I add the console logs, from the start of test or after the last test fail to the
// current fail, to the end of the error.stack property.
Cypress.on('fail', error => {
  error.stack += `\nConsole Logs:\n========================\n${logs}`;
  // clear logs after fail so we dont see duplicate logs
  logs = '';
  // still need to throw the error so tests wont be marked as a pass
  throw error;
});
