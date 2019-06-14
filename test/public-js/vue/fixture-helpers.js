'use strict';

function createSerializedRoomFixture(uri) {
  return {
    id: `5a8739841543b98772a686a9-${uri}`,
    name: uri,
    topic: 'You should read our rules',
    avatarUrl: 'http://localhost:5000/api/private/avatars/group/i/5a8739841543b98772a686a8',
    uri: uri,
    oneToOne: false,
    userCount: 1,
    unreadItems: 0,
    mentions: 0,
    lastAccessTime: '2019-05-28T15:33:05.508Z',
    lurk: false,
    url: `/${uri}`,
    githubType: 'REPO_CHANNEL',
    security: 'PUBLIC',
    noindex: false,
    tags: [],
    roomMember: true,
    groupId: '5a8739841543b98772a686a8',
    public: true,
    absoluteRoomUri: `http://localhost:5000/${uri}`
  };
}

function createSerializedOneToOneRoomFixture(username) {
  return {
    id: `5c17fc82b799f1de19e23f15-${username}`,
    name: `${username}`,
    topic: '',
    avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/4/EricGitterTester',
    oneToOne: true,
    userCount: 2,
    user: {
      id: '5b4d086e0ba77d2371a8df5a',
      username: `${username}`,
      displayName: `${username}`,
      url: `/${username}`,
      avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/4/EricGitterTester',
      avatarUrlSmall: 'https://avatars2.githubusercontent.com/u/18617621?v=4&s=60',
      avatarUrlMedium: 'https://avatars2.githubusercontent.com/u/18617621?v=4&s=128',
      v: 20,
      gv: '4'
    },
    unreadItems: 0,
    mentions: 0,
    lastAccessTime: '2019-05-25T07:38:29.610Z',
    lurk: false,
    url: `/${username}`,
    githubType: 'ONETOONE',
    noindex: false,
    tags: [],
    roomMember: true,
    groupId: null,
    public: false,
    absoluteRoomUri: `http://localhost:5000/${username}`
  };
}

module.exports = {
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture
};
