'use strict';

function isGitlabSecurityDescriptorType(type) {
  return type === 'GL_GROUP' || type === 'GL_PROJECT';
}

module.exports = isGitlabSecurityDescriptorType;
