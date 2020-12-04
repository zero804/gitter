'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const transformMatrixEventContentIntoGitterMessage = require('../lib/transform-matrix-event-content-into-gitter-message');
const env = require('gitter-web-env');
const config = env.config;

const configuredServerName = config.get('matrix:bridge:serverName');

const event = {
  room_id: `!12345:localhost`,
  event_id: `$12345:localhost`,
  sender: '@terry:localhost'
};

describe('transform-matrix-event-content-into-gitter-message', () => {
  it('placeholder so programmatic tests below run');

  before(async () => {
    const fixture = await fixtureLoader.createExpectedFixtures({
      user1: {}
    });

    describe('tests', () => {
      [
        {
          name: 'leaves plain-text alone',
          content: {
            body: 'some text',
            msgtype: 'm.text'
          },
          expectedText: 'some text'
        },
        {
          name: 'Replaces Matrix MXID mention with Gitter user mention',
          content: {
            msgtype: 'm.text',
            format: 'org.matrix.custom.html',
            body: `Heya ${fixture.user1.username} (${fixture.user1.displayName}) over there`,
            formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a> over there`
          },
          expectedText: `Heya @${fixture.user1.username} over there`
        },
        {
          name:
            'When username case in MXID is different, still replaces with Gitter mention correctly',
          content: {
            msgtype: 'm.text',
            format: 'org.matrix.custom.html',
            body: `Heya ${fixture.user1.username.toUpperCase()} (${
              fixture.user1.displayName
            }) over there`,
            formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username.toUpperCase()}-${
              fixture.user1.id
            }:${configuredServerName}">${fixture.user1.username.toUpperCase()} (${
              fixture.user1.displayName
            })</a> over there`
          },
          expectedText: `Heya @${fixture.user1.username} over there`
        },
        {
          name: 'Works when exclamation at end of mention',
          content: {
            msgtype: 'm.text',
            format: 'org.matrix.custom.html',
            body: `Heya ${fixture.user1.username} (${fixture.user1.displayName})!`,
            formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a>!`
          },
          expectedText: `Heya @${fixture.user1.username}!`
        },
        {
          name: 'Works when comma end of mention',
          content: {
            msgtype: 'm.text',
            format: 'org.matrix.custom.html',
            body: `Heya ${fixture.user1.username} (${fixture.user1.displayName}), did you see this?`,
            formatted_body: `Heya <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a>, did you see this?`
          },
          expectedText: `Heya @${fixture.user1.username}, did you see this?`
        },
        {
          name: 'Uses matrix.to link for MXIDs not from our Gitter homeserver',
          content: {
            msgtype: 'm.text',
            format: 'org.matrix.custom.html',
            body: `Heya madlittlemods (Eric Eastwood) over there`,
            formatted_body: `Heya <a href="https://matrix.to/#/@madlittlemods:matrix.org">madlittlemods (Eric Eastwood)</a> over there`
          },
          expectedText: `Heya [madlittlemods (Eric Eastwood)](https://matrix.to/#/@madlittlemods:matrix.org) over there`
        },
        {
          name: 'Formats status/m.emote (/me) message',
          content: {
            body: 'some text',
            msgtype: 'm.emote'
          },
          expectedText: '@terry:localhost some text'
        },
        {
          name: 'Should replace mention in status/m.emote (/me) message',
          content: {
            msgtype: 'm.emote',
            format: 'org.matrix.custom.html',
            body: `says hi to ${fixture.user1.username} (${fixture.user1.displayName}) and waves`,
            formatted_body: `says hi to <a href="https://matrix.to/#/@${fixture.user1.username}-${fixture.user1.id}:${configuredServerName}">${fixture.user1.username} (${fixture.user1.displayName})</a> and waves`
          },
          expectedText: `@terry:localhost says hi to @${fixture.user1.username} and waves`
        }
      ].forEach(meta => {
        it(meta.name, async () => {
          const newText = await transformMatrixEventContentIntoGitterMessage(meta.content, {
            ...event,
            content: meta.content
          });

          assert.strictEqual(newText, meta.expectedText);
        });
      });
    });
  });
});
