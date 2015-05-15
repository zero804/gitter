'use strict';

var Processor = require('gitter-markdown-processor');
var fs = require('fs');

suite('highlight', function() {
  set('iterations', 100);
  set('type', 'static');

  var processor;
  before(function(done) {
    processor = new Processor();
    var i = 0;
    (function warmup() {
      if (++i > 100)  {

        return done();
      }
      processor.process('```\nwarmup;```', warmup);
    })();
  });

  var files = fs.readdirSync(__dirname + "/testfiles/markdown");

  files.forEach(function(file) {
    // ignore hidden files like .DS_Store
    if (file.indexOf(".") == 0) return;
    var md = fs.readFileSync(__dirname + "/testfiles/markdown/" + file, "utf8");
    bench('highlight#' + file, function(done) {
      processor.process(md, done)
    });
  })
});
