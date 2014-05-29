#!/usr/bin/env node
/*jslint node: true, unused:true */
"use strict";

var format = require('stringformat');
var _ = require('underscore');
var nomnom = require('nomnom');

var CliOutput = function(columns, extraOpts) {
  var defaults = {};
  var showing = {};
  var opts = nomnom();

  if(extraOpts) {
    opts.options(extraOpts);
  }

  opts.option('noheader', { flag: true });

  Object.keys(columns).forEach(function(column) {
    defaults[column] = '-';
    opts.option(column, { flag: true });
    opts.option('no' + column, { flag: true });
  });

  var parsedOpts = opts.parse();

  var hasNoShowColumns = Object.keys(columns).some(function(column) {
    return parsedOpts['no' + column];
  });

  var hasShowColumns = Object.keys(columns).some(function(column) {
    return parsedOpts[column];
  });

  var defaultShow;
  if(hasNoShowColumns) {
    defaultShow = true;
  } else if(hasShowColumns) {
    defaultShow = false;
  } else {
    defaultShow = true;
  }

  Object.keys(columns).forEach(function(column) {
    var s;
    if(parsedOpts['no' + column]) {
      s = false;
    } else if(parsedOpts[column]) {
      s = true;
    } else {
      s = defaultShow;
    }

    showing[column] = s;
  });

  var formatString = Object.keys(columns).filter(function(column) {
    return showing[column];
  }).map(function(column) {
    return '{' + column + ':-' + columns[column].width + '}';
  }).join(' ');

  this.opts = parsedOpts;
  this.formatString = formatString;
  this.columns = columns;
  this.defaults = defaults;
  this.showing = showing;
};


CliOutput.prototype.headers = function() {
  if(this.opts.noheader) return;
  var self = this;

  var headers = Object.keys(self.columns).filter(function(column) {
    return self.showing[column];
  }).reduce(function(headers, column) {
    headers[column] = column;
    return headers;
  }, { });

  console.log(format(self.formatString, headers));
};


CliOutput.prototype.row = function(value) {
  console.log(format(this.formatString, _.defaults(value, this.defaults)));
};

module.exports = CliOutput;
