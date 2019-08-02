const _ = require('lodash');
const urlJoin = require('url-join');
const avatars = require('gitter-web-avatars');
const roomNameShortener = require('gitter-web-shared/room-name-shortener');
const getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
const getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');

const clientEnv = require('gitter-client-env');

export default function parseItemForTemplate(data, state) {
  data.name = data.name || data.uri || '';
  if (data.fromUser) {
    data.name = data.fromUser.username;
  }

  data.absoluteRoomUri = urlJoin(clientEnv.basePath, data.uri || data.url);

  //For user results
  if (data.displayName) {
    return _.extend(
      {},
      {
        name: roomNameShortener(data.displayName),
        avatarUrl: avatars.getForUser(data),
        absoluteRoomUri: data.absoluteRoomUri
      }
    );
  }

  const orgName = getOrgNameFromTroupeName(data.name);
  const roomName = getRoomNameFromTroupeName(data.name);

  let displayName = data.name;
  let namePieces = undefined;

  // TODO: Do we want this to be `defaultRoomName` from the group?
  // The default root room has been renamed from `Lobby` to `community`
  if (roomName === 'Lobby' || roomName === 'community') {
    displayName = orgName;
  } else if (orgName === roomName) {
    namePieces = data.name.split('/');
  }
  // Get rid of the org prefix, if viewing in a org bucket
  else if (state === 'org') {
    displayName = getRoomNameFromTroupeName(data.name);
  }

  // Truncate
  displayName = roomNameShortener(displayName);

  return _.extend({}, data, {
    displayName: displayName,
    namePieces: namePieces
  });
}
