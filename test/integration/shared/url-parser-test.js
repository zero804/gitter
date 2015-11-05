'use strict';

var assert = require('assert');
var urlParser = require('gitter-web-shared/url-parser');


describe('url parser', function() {
  it('formats back to the same url for well formatted urls', function() {
    var urls = [
    'https://lh5.googleusercontent.com/-8JzxZyD84qE/AAAAAAAAAAI/AAAAAAAAAN4/_x36v4AaxKo/photo.jpg?sz=50',
    'https://avatars.githubusercontent.com/u/69737?v=3',
    ].forEach(function(url) {
      var parsed = urlParser.parseUrl(url);
      var joined = urlParser.formatUrl(parsed);
      assert.equal(joined, url);
    });
  });

  it('parses the query string', function() {
    var parsed = urlParser.parseUrl('https://gitter.im/?a=1&b=2');
    assert.equal(parsed.query.a, 1);
    assert.equal(parsed.query.b, 2);
  });

  it('returns a blank query when there is none', function() {
    var parsed = urlParser.parseUrl('https://gitter.im/');
    assert.deepEqual(parsed.query, {});
  });

  it('formats the modified query string', function() {
    var parsed = urlParser.parseUrl('https://gitter.im/?a=1&b=2');
    delete parsed.query.a;
    parsed.query.b = 'x';
    parsed.query.c = '3';
    var url = urlParser.formatUrl(parsed);
    assert.equal(url, 'https://gitter.im/?b=x&c=3');
  });

  it('parses the url hash', function() {
    var parsed = urlParser.parseUrl('https://gitter.im/#foo');
    assert.equal(parsed.hash, '#foo');
  });

  it('parses the host into hostname and port', function() {
    var parsed = urlParser.parseUrl('https://localhost:3000/');
    assert.equal(parsed.hostname, 'localhost');
    assert.equal(parsed.port, '3000');
  });

  it('strips blank terms', function() {
    var parsed = urlParser.parseUrl('https://gitter.im/?&a=1');
    assert.equal(urlParser.formatUrl(parsed), 'https://gitter.im/?a=1');

    var parsed = urlParser.parseUrl('https://gitter.im/?');
    assert.deepEqual(parsed.query, {});
    assert.equal(urlParser.formatUrl(parsed), 'https://gitter.im/');

    var parsed = urlParser.parseUrl('https://gitter.im/?&');
    assert.deepEqual(parsed.query, {});
    assert.equal(urlParser.formatUrl(parsed), 'https://gitter.im/');
  });
});
