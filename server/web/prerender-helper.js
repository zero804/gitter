"use strict";

var compileTemplate = require('./compile-web-template');
var prerenderWrapper = compileTemplate.compileString('<{{wrap}} {{#if id}}id="{{id}}"{{/if}} {{#if className}}class="{{className}}"{{/if}}>{{{inner}}}</{{wrap}}>');

var PRERENDERED_VIEWS = [
  "js/views/archive/tmpl/archive-navigation-view",
  "js/views/app/tmpl/headerViewTemplate",
  "js/views/menu/tmpl/troupeMenu",
  "js/views/menu/tmpl/troupeMenu",
  "js/views/app/tmpl/headerViewTemplate",
  "js/views/chat/tmpl/chatInputView",
  "js/views/search/tmpl/search-input",
  "js/views/search/tmpl/search",
  'js/views/people/tmpl/peopleCollectionView',

  /* new */
  "js/views/menu/tmpl/profile"
].reduce(function(memo, v) {
  memo[v] = compileTemplate(v + ".hbs");
  return memo;
}, {});

module.exports = exports = function (templateFile, options) {
  var hash = options.hash;

  var template = PRERENDERED_VIEWS[templateFile];
  if (!template) throw new Error('Template ' + templateFile + ' has not been precompiled.');

  var wrap = hash.wrap;
  var className = hash.className;
  var id = hash.id;
  var inner = template(this);
  if (!hash.wrap) return inner;

  return prerenderWrapper({
    className: className,
    id: id,
    wrap: wrap,
    inner: inner
  });
};
