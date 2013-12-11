/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var underTest = testRequire('./utils/url-extractor');

describe('url-extractor', function() {
  it('should find urls in the trivial case', function() {
    var urls = underTest.extractUrlsWithIndices('http://www.blob.com');
    assert.equal(urls.length, 1);
    assert.equal(urls[0].url, 'http://www.blob.com');
    assert.equal(urls[0].indices[0], 0);
    assert.equal(urls[0].indices[1], 19);
  });

  it('should find multiple urls', function() {
    var urls = underTest.extractUrlsWithIndices('http://www.blob.com https://trou.pe');
    assert.equal(urls.length, 2);
    assert.equal(urls[0].url, 'http://www.blob.com');
    assert.equal(urls[0].indices[0], 0);
    assert.equal(urls[0].indices[1], 19);

    assert.equal(urls[1].url, 'https://trou.pe');
    assert.equal(urls[1].indices[0], 20);
    assert.equal(urls[1].indices[1], 35);
  });

  it('should find urls and email addresses', function() {
    var urls = underTest.extractUrlsWithIndices('http://www.blob.com andrewn@datatribe.net');
    assert.equal(urls.length, 2);
    assert.equal(urls[0].url, 'http://www.blob.com');
    assert.equal(urls[0].indices[0], 0);
    assert.equal(urls[0].indices[1], 19);

    assert.equal(urls[1].url, 'mailto:andrewn@datatribe.net');
    assert.equal(urls[1].indices[0], 20);
    assert.equal(urls[1].indices[1], 41);
  });



  it('should work with horrible google urls and not detect email addresses inside other urls', function() {
    var urls = underTest.extractUrlsWithIndices("https://www.google.co.uk/search?q=andrew@datatribe.net+'Andrew+Newdigate+%3Candrew+()+DATATRIBE+!+NET%3E'+posts+-+MARC&client=safari&rls=en&biw=1432&bih=607&source=lnms&sa=X&ei=AFoOUoCrDqrK0QW3k4DYDA&ved=0CAgQ_AUoAA#bav=on.2,or.r_cp.r_qf.&ei=FFoOUoq2JrST0QX7toHACw&fp=79fd8eec091bd4dc&q=andrew%40datatribe.net+'Andrew+Newdigate+%3Candrew+()+DATATRIBE+!+NET%3E'+posts+-+MARC&rls=en&sa=X&tbs=li:1&ved=0CCYQpwUoAw");
    assert.equal(urls.length, 1);
    assert.equal(urls[0].url, "https://www.google.co.uk/search?q=andrew@datatribe.net+'Andrew+Newdigate+%3Candrew+()+DATATRIBE+!+NET%3E'+posts+-+MARC&client=safari&rls=en&biw=1432&bih=607&source=lnms&sa=X&ei=AFoOUoCrDqrK0QW3k4DYDA&ved=0CAgQ_AUoAA#bav=on.2,or.r_cp.r_qf.&ei=FFoOUoq2JrST0QX7toHACw&fp=79fd8eec091bd4dc&q=andrew%40datatribe.net+'Andrew+Newdigate+%3Candrew+()+DATATRIBE+!+NET%3E'+posts+-+MARC&rls=en&sa=X&tbs=li:1&ved=0CCYQpwUoAw");
    assert.equal(urls[0].indices[0], 0);
    assert.equal(urls[0].indices[1], 410);
  });

  describe('isses extraction', function() {
    it('should find issues in the trivial case', function() {
      var issues = underTest.extractIssuesWithIndices('#1234');
      assert.equal(issues.length, 1);
      assert.equal(issues[0].number, '1234');
      assert.equal(issues[0].indices[0], 0);
      assert.equal(issues[0].indices[1], 5);
    });

    it('should not match mid word', function() {
      var issues = underTest.extractIssuesWithIndices('abc#1234');
      assert.equal(issues.length, 0);
    });

    it('should not match non numeric issues', function() {
      var issues = underTest.extractIssuesWithIndices('#YOLO');
      assert.equal(issues.length, 0);
    });

    it('should find multiple issues', function() {
      var issues = underTest.extractIssuesWithIndices('#1234 #5678');
      assert.equal(issues.length, 2);
      assert.equal(issues[0].number, '1234');
      assert.equal(issues[0].indices[0], 0);
      assert.equal(issues[0].indices[1], 5);

      assert.equal(issues[1].number, '5678');
      assert.equal(issues[1].indices[0], 6);
      assert.equal(issues[1].indices[1], 11);
    });

  });

});