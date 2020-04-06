'use strict';

const debug = require('debug')('gitter:infra:serializer:gitlab-project');
const Lazy = require('lazy.js');
const persistence = require('gitter-web-persistence');
const TroupeStrategy = require('./troupe-strategy');

function GitlabProjectStrategy(options) {
  const troupeStrategy = new TroupeStrategy(options);

  let sdExternalIdToRoomMap = {};
  this.preload = async function(projects) {
    if (projects.isEmpty()) return;

    const projectIds = projects
      .map(function(project) {
        return project.id;
      })
      .toArray();

    const rooms = await persistence.Troupe.find({ 'sd.type': 'GL_PROJECT' })
      .where('sd.externalId')
      .in(projectIds)
      .exec();

    rooms.forEach(room => {
      sdExternalIdToRoomMap[room.sd.externalId] = room;
    });

    return troupeStrategy.preload(Lazy(rooms));
  };

  this.map = function(item) {
    debug('map', item);

    const room = sdExternalIdToRoomMap[item.id];

    return {
      type: 'GL_PROJECT',
      id: item.id,
      name: item.name,
      description: item.description,
      absoluteUri: item.absoluteUri,
      uri: item.uri,
      private: item.private,
      avatar_url: item.avatar_url,
      room: room ? troupeStrategy.map(room) : undefined
    };
  };
}

GitlabProjectStrategy.prototype = {
  name: 'GitlabProjectStrategy'
};

module.exports = GitlabProjectStrategy;
