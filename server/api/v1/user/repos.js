'use strict';

var restful = require('../../../services/restful');
var repoService = require('../../../services/repo-service');
const restSerializer = require('../../../serializers/rest-serializer');
var StatusError = require('statuserror');

function indexQuery(req) {
  const limit = parseInt(req.query.limit, 10) || 0;
  const query = (req.query.q || '').replace(/\*|\+|\$/g, '');

  return repoService.searchReposForUser(req.user, query, limit).then(async repos => {
    const serializedRepos = await restful.serializeRepos(req.user, repos);

    let filteredSerializedRepos = serializedRepos;
    if (limit) {
      // Repos with rooms are listed first
      const sortedRepos = serializedRepos.sort((a, b) => {
        if (a.room && !b.room) {
          return -1;
        } else if (!a.room && b.room) {
          return 1;
        }

        return 0;
      });

      filteredSerializedRepos = sortedRepos.slice(0, limit + 1);
    }

    const searchStrategy = new restSerializer.SearchResultsStrategy({
      resultsAlreadySerialized: true
    });
    return restSerializer.serializeObject({ results: filteredSerializedRepos }, searchStrategy);
  });
}

module.exports = {
  id: 'repo',
  index: function(req) {
    if (!req.user) throw new StatusError(401);

    if (req.query.q) {
      return indexQuery(req);
    }

    if (req.query.type === 'admin') {
      return restful.serializeAdminReposForUser(req.user);
    }

    return restful.serializeReposForUser(req.user);
  }
};
