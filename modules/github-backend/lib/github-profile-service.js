'use strict';

var Mirror = require('gitter-web-github').GitHubMirrorService('user');


module.exports = function gitHubProfileService(gitHubUser, includeCore) {
  var gitHubUri = 'users/' + gitHubUser.username;

  // erm. This uses the user we're looking up's tokens, not the user requesting
  // the lookup.
  var mirror = new Mirror(gitHubUser);

  return mirror.get(gitHubUri)
    .then(function(body) {
      if (!body || !body.login) return;

      var blogUrl;
      if (body.blog) {
        if (!body.blog.match(/^https?:\/\//)) {
          blogUrl = 'http://' + body.blog;
        } else {
          blogUrl = body.blog;
        }
      }

      var profile = {};

      if (includeCore) {
        // core fields are only useful if we aren't using what's in our db
        profile.username = body.login;
        profile.displayName =  body.name;
      }

      //standard
      profile.company = body.company;
      profile.location = body.location;
      profile.email = body.email;
      profile.website = blogUrl;
      profile.profile = body.html_url;

      // github-specific
      profile.followers = body.followers;
      profile.public_repos = body.public_repos;
      profile.following = body.following;

      return profile;
    })
};
