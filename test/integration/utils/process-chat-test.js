"use strict";

var assert = require('assert');
var testRequire = require('../test-require');
var processChat = testRequire('./utils/process-chat');
var fs = require('fs');
var path = require('path');

describe('process-chat', function() {

  var dir = path.join(__dirname, 'markdown-conversions');

  var items = fs.readdirSync(dir);
  console.log(items);
  items.filter(function(file) {
    return /\.markdown$/.test(file);
  }).forEach(function(file) {
    var markdownFile = path.join(dir, file);
    var htmlFile = markdownFile.replace('.markdown', '.html');
    var markdown = fs.readFileSync(markdownFile, { encoding: 'utf8' });
    var expectedHtml = fs.readFileSync(htmlFile, { encoding: 'utf8' });

    it('should handle ' + file, function() {
      var html = processChat(markdown).html;
      assert.equal(html.trim(), expectedHtml.trim());
    });

  });

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

});
