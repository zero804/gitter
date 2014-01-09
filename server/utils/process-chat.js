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

  renderer.issue = function(repo, issue, text) {
    issues.push({
      number: issue,
      repo: repo ? repo : undefined
    });

    var out = '<a href="#" data-link-type="issue" data-issue="' + issue + '"';
    if(repo) {
      out += util.format(' data-issue-repo="%s"', repo);
    }
    out += '>' + text + '</a>';
    return out;
  };

  renderer.link = function(href, title, text) {
    urls.push({ url: href });
    return util.format('<a href="%s" rel="nofollow" target="_new" class="link">%s</a>', href, text);
  };

  renderer.image = function(href, title, text) {
    urls.push({ url: href });
    return util.format('<img src="%s" alt="%s" rel="nofollow">', href, text);

  };

  renderer.mention = function(href, title, text) {
    var screenName = text.charAt(0) === '@' ? text.substring(1) : text;
    mentions.push({ screenName: screenName });
    return util.format('<span data-link-type="mention" data-screen-name="%s" class="mention">%s</span>', screenName, text);
  };

  renderer.email = function(href, title, text) {
    urls.push({ url: href });
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