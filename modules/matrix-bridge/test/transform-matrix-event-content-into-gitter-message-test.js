'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const transformMatrixEventContentIntoGitterMessage = require('../lib/transform-matrix-event-content-into-gitter-message');
const env = require('gitter-web-env');
const config = env.config;

const configuredServerName = config.get('matrix:bridge:serverName');

describe('transform-matrix-event-content-into-gitter-message', () => {
  it('leaves plain-text alone', async () => {
    const content = {
      body: 'some text',
      msgtype: 'm.text'
    };
    const newText = await transformMatrixEventContentIntoGitterMessage(content);

    assert.strictEqual(newText, 'some text');
  });

  before(async () => {
    const fixture = await fixtureLoader.createExpectedFixtures({
      user1: {}
    });

    describe('user mentions', () => {
      [
        {
          name: 'Replaces Matrix MXID mention with Gitter user mention',
          body: `Heya ${fixture.user1.username} (${fixture.user1.displayName}) over there`,
          formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a> over there`,
          expectedText: `Heya @${fixture.user1.username} over there`
        },
        {
          name:
            'When username case in MXID is different, still replaces with Gitter mention correctly',
          body: `Heya ${fixture.user1.username.toUpperCase()} (${
            fixture.user1.displayName
          }) over there`,
          formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username.toUpperCase()}-${
            fixture.user1.id
          }:${configuredServerName}">${fixture.user1.username.toUpperCase()} (${
            fixture.user1.displayName
          })</a> over there`,
          expectedText: `Heya @${fixture.user1.username} over there`
        },
        {
          name: 'Works when exclamation at end of mention',
          body: `Heya ${fixture.user1.username} (${fixture.user1.displayName})!`,
          formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a>!`,
          expectedText: `Heya @${fixture.user1.username}!`
        },
        {
          name: 'Works when comma end of mention',
          body: `Heya ${fixture.user1.username} (${fixture.user1.displayName}), did you see this?`,
          formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a>, did you see this?`,
          expectedText: `Heya @${fixture.user1.username}, did you see this?`
        },
        {
          name: 'Uses matrix.to link MXIDs not from our Gitter homeserver',
          body: `Heya madlittlemods (Eric Eastwood) over there`,
          formatted_body: `Heya <a href="https://matrix.to/#/@madlittlemods:matrix.org">madlittlemods (Eric Eastwood)</a> over there`,
          expectedText: `Heya [madlittlemods (Eric Eastwood)](https://matrix.to/#/@madlittlemods:matrix.org) over there`
        }
      ].forEach(meta => {
        it(meta.name, async () => {
          const content = {
            body: meta.body,
            format: 'org.matrix.custom.html',
            formatted_body: meta.formatted_body,
            msgtype: 'm.text'
          };
          const newText = await transformMatrixEventContentIntoGitterMessage(content);

          assert.strictEqual(newText, meta.expectedText);
        });
      });
    });
  });
});
