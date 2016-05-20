'use strict';

var isValidRoomUri = require('../../../public/js/utils/valid-room-uri');
var RESERVED = require('gitter-web-validators/lib/reserved-namespaces');
var assert = require('assert');

function test(name, result) {
  result = typeof result !== 'undefined' ? result : true;
  assert.equal(isValidRoomUri(name), result);
}

describe('valid-room-uri', function () {

  it('rejects vanity keywords', function () {
    RESERVED
      .forEach(function (keyword) {
        test('/' + keyword, false);
      });
  });

  it('accepts rooms with vanity keywords, but aren\'t vanity keyworkds', function () {
    test('/aboutandrew');
    test('/apiguy');
    test('/aboutandrew?test=true');
    test('/apiguy?test=true');
  });

  it('rejects undefined and empty string', function () {
    test('     ', false);
    test(null, false);
    test(undefined, false);
    test('', false);
    test('a', false);
  });

  it('rejects archive links', function () {
    test('/gitterHQ/gitter/archives/all', false);
    test('/gitterHQ/gitter/archives/2014/12/11', false);
    test('/gitterHQ/gitter/archives/all?test=true', false);
    test('/gitterHQ/gitter/archives/2014/12/11?test=true', false);
  });

  it('accepts room URIs', function () {
    test('/gitterHQ');
    test('/gitterHQ/gitter');
    test('/gitterHQ/gitter/channel');
    test('/gitterHQ?test=true');
    test('/gitterHQ/gitter?test=true');
    test('/gitterHQ/gitter/channel?test=true');
  });

  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should detect orgs with dashes in their names', function() {
    test('/orgs/dev-ua/rooms', false);
  });

  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should detect orgs community with underscores in their names', function() {
    test('/orgs/dev_ua/rooms', false);
  });

  /**
  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should anything under /orgs/', function() {
    test('/orgs/blah/blah/blah', false);
  });

  /**
   *
   */
  it.skip('should ensure that org names do not have underscores in them', function() {
    test('/gitter_hq', false);
  });
});
