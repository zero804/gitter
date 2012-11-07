/*jslint node: true */
"use strict";

var express = require('express');
var winston = require("winston");

/* Patched version of formidable that can handle octet-streams */
/* See https://github.com/scriby/node-formidable */
var formidable = require('formidable');

module.exports = {
  install: function() {
    winston.error("Skipping broken bodyParser registration: fix in bodyparsers-additional.js!");

    return;

    express.bodyParser.parse['application/octet-stream'] = function(req, options, fn) {
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        if(err) return fn(err);

        if(files && files.file && files.file.name) {
          files.file.name = decodeURIComponent(files.file.name);
        }

        req.files = files;
        fn();
      });
    };
  }
};
