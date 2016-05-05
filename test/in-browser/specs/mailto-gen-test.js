
var log = require('../../../public/js/utils/log');
var mailto = require('../../../public/js/utils/mailto-gen');
var assert = require('assert');

describe('mailto-gen', function () {

  var email = {
    target: 'testing@test.com',
    subject: 'test',
    body: 'testing',
    content: 'TEST',
    BCC: 'onemore@test.com',
    CC: 'another@test.com'
  };

  var el = mailto.el(email);

  it('innerHTML', function () {
    assert(el.innerHTML === email.content, 'innerHTML is wrong');
  });

  it('href', function () {
    assert(el.href === 'mailto:testing@test.com?subject=test&body=testing&CC=another@test.com&BCC=onemore@test.com', 'href is wrong');
  });

  it('mailto.str()', function () {
    assert(el.outerHTML === mailto.str(email), 'outerHTML is wrong');
  });
});
