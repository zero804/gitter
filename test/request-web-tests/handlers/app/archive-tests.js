'use strict';

process.env.DISABLE_MATRIX_BRIDGE = '1';
process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var request = require('supertest');
const moment = require('moment');

const env = require('gitter-web-env');
const config = env.config;
const app = require('../../../../server/web');
const chatService = require('gitter-web-chats');
const ChatMessage = require('gitter-web-persistence').ChatMessage;

describe('handlers/app/archive', () => {
  describe('chat archive', () => {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: {
        users: ['user1']
      },
      message1: {
        user: 'user1',
        troupe: 'troupe1',
        readBy: [],
        text: '3nd of January in Australia',
        sent: new Date('2018-01-02T20:00:00.000Z')
      }
    });

    it('GET /{troupe.uri}/archives/2018/01/02 returns archive', async function() {
      return request(app)
        .get(`/${fixture.troupe1.uri}/archives/2018/01/02?at=${fixture.message1.id}`)
        .expect(200);
    });

    it('GET /{troupe.uri}/archives/2018/01/02?at={messageId} permalink returns archive', async function() {
      // this test takes around 100ms when run in the whole suite
      // when running only this suite it can take around 3s
      this.timeout(8000);
      return request(app)
        .get(`/${fixture.troupe1.uri}/archives/2018/01/02?at=${fixture.message1.id}`)
        .set('Cookie', ['gitter_tz=-1000:Australian Eastern Standard Time:Australia/Melbourne'])
        .expect(200);
    });

    it('GET /{troupe.uri}/archives/2018/01/03?at={messageId} message from another day redirects to that day in the archive', async function() {
      const response = await request(app)
        .get(`/${fixture.troupe1.uri}/archives/2018/01/03?at=${fixture.message1.id}`)
        .set('Cookie', ['gitter_tz=-0200:Central European Summer Time:Europe/Prague'])
        .expect(302);
      assert(response.headers.location.includes('/archives/2018/01/02?at='));
    });
  });

  describe('chat archive hour range pagination', () => {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: {
        users: ['user1']
      }
    });

    before(async () => {
      const numTestMessages = 2 * chatService.ARCHIVE_MESSAGE_LIMIT;
      for (const i of Array.from({ length: numTestMessages }, (x, i) => i)) {
        const duration = moment.duration(i / numTestMessages, 'days');

        await ChatMessage.create({
          toTroupeId: fixture.troupe1.id,
          fromUserId: fixture.user1.id,
          text: `my-${i}-message`,
          sent: moment.utc('2020-03-05 00:00:00Z').add(duration.asMilliseconds(), 'ms')
        });
      }
    });

    it('Fetching the whole day that has too many messages to display will redirect to the first hour chunk', async function() {
      const response = await request(app)
        .get(`/${fixture.troupe1.uri}/archives/2020/03/05`)
        .expect(302);

      assert.strictEqual(
        response.headers.location,
        `${config.get('web:basepath')}/${fixture.troupe1.uri}/archives/2020/03/05/0-1`
      );
    });

    it('Trying to fetch more than an hour will redirect to just a 1 hour chunk', async function() {
      const response = await request(app)
        .get(`/${fixture.troupe1.uri}/archives/2020/03/05/5-10`)
        .expect(302);

      assert.strictEqual(
        response.headers.location,
        `${config.get('web:basepath')}/${fixture.troupe1.uri}/archives/2020/03/05/5-6`
      );
    });

    it('Fetch hour chunk only shows messages within that hour', async function() {
      const response = await request(app)
        .get(`/${fixture.troupe1.uri}/archives/2020/03/05/4-5`)
        .expect(200);

      const messageMatches = response.text.match(/my-(.*?)-message/gm);
      const debugMessageString = `First message: ${messageMatches &&
        messageMatches[0]}, Last message: ${messageMatches &&
        messageMatches[messageMatches.length - 1]}`;
      assert(
        response.text.includes('my-500-message'),
        `Response does not include first message from 4-5 hour range. ${debugMessageString}`
      );
      assert(
        response.text.includes('my-625-message'),
        `Response does not include last message from 4-5 hour range. ${debugMessageString}`
      );
      assert(
        !response.text.includes('my-1-message'),
        `Response includes message before the 4-5 hour range. ${debugMessageString}`
      );
      assert(
        !response.text.includes('my-1000-message'),
        `Response includes message after the 4-5 hour range. ${debugMessageString}`
      );
    });
  });
});
