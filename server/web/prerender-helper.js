"use strict";

var compileTemplate = require('./compile-web-template');
var prerenderWrapper = require('./prerender-wrapper');

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
  "js/views/menu/tmpl/profile",
  "js/views/menu/tmpl/org-list-item",
].reduce(function(memo, v) {
  memo[v] = compileTemplate(v + ".hbs");
  return memo;
}, {});

module.exports = exports = function (templateFile, options) {
  var hash = options.hash;

  var template = PRERENDERED_VIEWS[templateFile];
  if (!template) throw new Error('Template ' + templateFile + ' has not been precompiled.');

  var inner = template(this);
  var wrap = hash.wrap;
  if (!wrap) return inner;

  var className = hash.className;
  var id = hash.id;
  var dataId = hash.dataId && this.id;

  return prerenderWrapper({
    className: className,
    id: id,
    dataId: dataId,
    wrap: wrap,
    inner: inner
  });
};
