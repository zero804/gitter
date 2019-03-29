const assert = require('assert');

const testRequire = require('../../test-require');
const generatePermalink = testRequire('../shared/chat/generate-permalink');

describe('generate-permalink', () => {
  const basePath = 'https://gitter.im';
  const troupeName = 'group/room';
  const id = '5c94afb8b9552a27a7930fbb';
  const sent = '2019-03-22T09:49:43.939Z';

  it('should generate normal permalink', () => {
    const permalink = generatePermalink(basePath, troupeName, id, sent, false);
    assert.strictEqual(permalink, `https://gitter.im/group/room?at=5c94afb8b9552a27a7930fbb`);
  });

  it('should generate archive permalink', () => {
    const permalink = generatePermalink(basePath, troupeName, id, sent, true);
    assert.strictEqual(
      permalink,
      `https://gitter.im/group/room/archives/2019/03/22/?at=5c94afb8b9552a27a7930fbb`
    );
  });
});
