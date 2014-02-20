/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var marked    = require('marked');
var highlight = require('highlight.js');
var _         = require('underscore');
var util      = require('util');

var options = { gfm: true, tables: true, sanitize: true, breaks: true, linkify: true, skipComments: true };

var lexer = new marked.Lexer(options);

var JAVA =  'java';
var SCRIPT = 'script:';
var scriptUrl = JAVA + SCRIPT;
var dataUrl = 'data:';
var httpUrl = 'http://';
var httpsUrl = 'https://';
var noProtocolUrl = '//';

module.exports = exports = function processChat(text) {
  var urls      = [];
  var mentions  = [];
  var issues    = [];
  var paragraphCount = 0;

  function checkForIllegalUrl(href) {
    if(!href) return "";

    href = href.trim();
    var hrefLower = href.toLowerCase();

    if(hrefLower.indexOf(scriptUrl) === 0 || hrefLower.indexOf(dataUrl) === 0) {
      /* Rickroll the script kiddies */
      return "http://goo.gl/a7HIYr";
    }

    if(hrefLower.indexOf(httpUrl) !== 0 && hrefLower.indexOf(httpsUrl) !== 0 && hrefLower.indexOf(noProtocolUrl) !== 0)  {
      return httpUrl + href;
    }

    return href;
  }

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

    var out = '<a data-link-type="issue" data-issue="' + issue + '"';
    if(repo) {
      out += util.format(' data-issue-repo="%s"', repo);
    }
    out += ' class="issue">' + text + '</a>';
    return out;
  };

  renderer.link = function(href, title, text) {
    href = checkForIllegalUrl(href);
    urls.push({ url: href });
    return util.format('<a href="%s" rel="nofollow" target="_new" class="link">%s</a>', href, text);
  };

  renderer.image = function(href, title, text) {
    href = checkForIllegalUrl(href);
    urls.push({ url: href });
    return util.format('<img src="%s" alt="%s" rel="nofollow">', href, text);

  };

  renderer.mention = function(href, title, text) {
    var screenName = text.charAt(0) === '@' ? text.substring(1) : text;
    mentions.push({ screenName: screenName });
    return util.format('<span data-link-type="mention" data-screen-name="%s" class="mention">%s</span>', screenName, text);
  };

  renderer.email = function(href, title, text) {
    checkForIllegalUrl(href);

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