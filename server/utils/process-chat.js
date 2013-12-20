/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var marked    = require('marked');
var highlight = require('highlight.js');
var _         = require('underscore');
var util      = require('util');

var options = { gfm: true, tables: true, sanitize: true, breaks: true, linkify: true };

var lexer = new marked.Lexer(options);

module.exports = exports = function processChat(text) {
  var urls      = [];
  var mentions  = [];
  var issues    = [];
  var paragraphCount = 0;

  var renderer = new marked.Renderer();

  // Highlight code blocks
  renderer.code = function(code) {
    return util.format('<pre><code>%s</code></pre>', highlight.highlightAuto(code).value);
  };

  // Extract urls mentions and issues from paragraphs
  renderer.paragraph = function(text) {
    paragraphCount++;
    return util.format('<p>%s</p>', text);
  };

  renderer.issue = function(href, title, text) {
    issues.push({ number: text });
    return util.format('<a href="#" data-link-type="issue" data-issue="%s" class="issue">%s</a>', href, text);
  };

  renderer.link = function(href, title, text) {
    mentions.push({ url: href });
    return util.format('<a href="%s" rel="nofollow" class="link">%s</a>', href, text);
  };

  renderer.image = function(href, title, text) {
    mentions.push({ url: href });
    return util.format('<img src="%s" alt="%s" rel="nofollow">', href, text);

  };

  renderer.mention = function(href, title, text) {
    mentions.push({ screenName: text });
    return util.format('<span data-link-type="mention" data-screen-name="%s" class="mention">%s</span>', text, text);
  };

  renderer.email = function(href, title, text) {
    return util.format('<a href="%s" rel="nofollow">%s</a>', href, text);
  };

  var tokens = lexer.lex(text);

  var parser = new marked.Parser(_.extend({ renderer: renderer }, options));
  var html = parser.parse(tokens);

  if(paragraphCount === 1) {
    html = html.replace(/<\/?p>/g,'');
  }

  return {
    text: text,
    html: html,
    urls: urls,
    mentions: mentions,
    issues: issues
  };
};