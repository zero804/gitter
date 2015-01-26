/* jshint node:true */
"use strict";

var conf = require('../utils/config');

function inserter(repoName, fileExt, content) {
  // assume everything is markdown
  return injectBadgeIntoMarkdown(content, repoName);
}

function injectBadgeIntoMarkdown(content, repoName) {
  var badgeContent = getBadgeMarkdown(repoName);

  var lines = content.split(/\n/);
  var idealLine = findIdealLineForInsert(lines) || 0;

  lines.splice(idealLine, 0, badgeContent);

  return lines.join('\n');
}

function findIdealLineForInsert(lines) {
  if(lines.length === 0) return 0;
  var i = 0;
  var seenHeader = false;

  for(;i < lines.length;i++) {
    if(/^\s*(\#+|={3,}|-{3,})/.test(lines[i])) {
      seenHeader = true;
    } else {
      if(seenHeader) break;
    }
  }

  return i;
}

function getBadgeMarkdown(repo) {
  var contentLink = '&utm_content=badge';
  var imageUrl = conf.get('web:badgeBaseUrl') + '/Join%20Chat.svg';
  var linkUrl =  conf.get('web:basepath') + '/' + repo + '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge' + contentLink;
  return '\n[![Gitter](' + imageUrl + ')](' + linkUrl + ')';
}


module.exports = inserter;
