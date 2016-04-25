"use strict";

module.exports = {
  githubType: { type: String, enum: ['NONE', 'GITHUB_REPO', 'GITHUB_ORG', 'ONETOONE']/*, required: true */ },
  public: { type: Boolean },
  linkPath: { type: String },
  // TODO: Add link object for internal references?
};
