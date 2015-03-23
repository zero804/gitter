"use strict";

var compileTemplate = require('./compile-web-template');

var PRERENDERED_VIEWS = [
  "js/views/archive/tmpl/archive-navigation-view",
  "js/views/app/tmpl/headerViewTemplate",
  "js/views/menu/tmpl/troupeMenu",
  "js/views/menu/tmpl/troupeMenu",
  "js/views/app/tmpl/headerViewTemplate",
  "js/views/chat/tmpl/chatInputView",
  "js/views/search/tmpl/search-input",
  "js/views/search/tmpl/search",
  'js/views/people/tmpl/peopleCollectionView'
].reduce(function(memo, v) {
  memo[v] = compileTemplate(v + ".hbs");
  return memo;
}, {});

module.exports = exports = function (templateFile) {
  var template = PRERENDERED_VIEWS[templateFile];
  if (!template) throw new Error('Template ' + template + ' has not been precompiled.');
  return template(this);
};
