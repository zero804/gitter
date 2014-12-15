#!/usr/bin/env node
/* jshint node:true */
"use strict";

var postcss = require('postcss');
var fs = require('fs');
var path = require('path');
var reduceFunctionCall = require('reduce-function-call');
var url = require('url');

var opts = require("nomnom")
  .option('input', {
    position: 0,
    required: true,
    help: 'Output'
  })
  .parse();

var resources = {};

function getFileName(value) {
  var u = url.parse(value);
  if(u.protocol || u.hostname) return value;

  value = u.pathname;

  if(value.indexOf('.') === 0) {
    var abs = path.resolve(path.dirname(opts.input), value);
    return path.relative(process.cwd(), abs);
  }

  return value;
}

var css = postcss.parse(fs.readFileSync(opts.input));

css.eachDecl(function(decl) {
  if (!decl.value) return;

  if(decl.prop !== 'src' || decl.parent.name !== 'font-face') return;

  var d = decl.parent.decls.filter(function(d) {
    return d.prop === 'src' && d.parent.name === 'font-face';
  });

  if(!d.length) return;

  // var hasTtf = d.filter(function(x) {
  //   return x.value.indexOf('.ttf') >= 0;
  // });

  // if(hasTtf.length) {
  //   decl.parent.decls = hasTtf;
  // }

});

css.eachDecl(function(decl) {
  if (!decl.value) return;

  var urls = [];
  var ttf;

  reduceFunctionCall(decl.value, "url", function(value) {
    var m = /^['"]([^'"]*)['"]$/.exec(value);
    if(m) value = m[1];

    value = getFileName(value);

    urls.push(value);
  });

  if(decl.prop === 'src' && decl.parent.name === 'font-face') {
    // If there are multiple fonts, choose the ttf
    var ttfs = urls.filter(function(v) {
      return (/\.ttf/).test(v);
    });

    if(ttfs.length > 0) {
      urls = ttfs;
    }
  }

  urls.forEach(function(value) {
    resources[value] = true;
  });

});

Object.keys(resources).forEach(function(key) {
  console.log(key);
});
