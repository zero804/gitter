#!/usr/bin/env node
/*jslint node: true, unused:true */
"use strict";

var format = require('stringformat');
var nomnom = require('nomnom');
var _ = require('underscore');

var CliOutput = function(columns) {
  var n = nomnom();
  var defaults = {};

  n.option('header', { type: 'boolean', default: true });

  Object.keys(columns).forEach(function(column) {
    n.option(column, { type: 'boolean', default: true });
    defaults[column] = '-';
  });

  var opts = n.parse();

  var formatString = Object.keys(columns).filter(function(column) {
    return opts[column];
  }).map(function(column) {
    return '{' + column + ':-' + columns[column].width + '}';
  }).join(' ');

  this.formatString = formatString;
  this.opts = opts;
  this.columns = columns;
  this.defaults = defaults;
};

CliOutput.prototype.headers = function() {
  if(!this.opts.header) return;
  var self = this;

  var headers = Object.keys(self.columns).filter(function(column) {
    return self.opts[column];
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
