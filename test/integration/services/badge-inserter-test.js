/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var inserter = require('../test-require')('./services/badge-inserter');
var assert = require('assert');

describe('badge-inserter', function() {
  it('inserts into markdown', function() {
    var markdown = '# My Amazing Library\n' +
                   '\n' +
                   '## Features\n' +
                   '\n' +
                   'It does amazing things!\n';

    var result = inserter('myorg/myrepo', 'md', markdown);

    assert.equal(result, '# My Amazing Library\n' +
                         '\n' +
                         '[![Gitter](http://localhost:4000/Join%20Chat.svg)](http://localhost:5000/myorg/myrepo?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)\n' +
                         '\n' +
                         '## Features\n' +
                         '\n' +
                         'It does amazing things!\n');
  });

});

