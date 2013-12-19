/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var marked    = require('marked');
var highlight = require('highlight.js');
var _         = require('underscore');

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
    return '<pre><code>' + highlight.highlightAuto(code).value + '</code></pre>';
  };

  // Extract urls mentions and issues from paragraphs
  renderer.paragraph = function(text) {
    paragraphCount++;
    return '<p>' + text + '</p>';
  };

  renderer.issue = function(href, title, text) {
    issues.push({ number: text });
    return '<a href="#" data-link-type="issue" data-issue="' + href + ' class="issue">' + text + '</a>';
  };

  renderer.link = function(href, title, text) {
    mentions.push({ url: href });
    var out = '<a href="' + href + '" rel="nofollow" class="link">' + text + '</a>';
    return out;
  };

  renderer.image = function(href, title, text) {
    mentions.push({ url: href });

    var out = '<img src="' + href + '" alt="' + text + '" rel="nofollow">';
    return out;
  };

  renderer.mention = function(href, title, text) {
    mentions.push({ screenName: text });
    return '<span data-link-type="mention" data-screen-name="' + text + '" class="mention">' + text + '</span>';
  };

  renderer.email = function(href, title, text) {
    return '<a href="' + href + '" rel="nofollow">' + text + '</a>';
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