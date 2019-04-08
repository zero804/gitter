'use strict';

const moment = require('moment');
var clientEnv = require('gitter-client-env');

module.exports = (troupeName, id, sent, isArchive) => {
  const basePath = clientEnv['basePath'];
  if (isArchive) {
    const urlDate = moment(sent).format('YYYY/MM/DD');
    return `${basePath}/${troupeName}/archives/${urlDate}/?at=${id}&timestamp=${moment(
      sent
    ).toISOString()}`;
  }
  return `${basePath}/${troupeName}?at=${id}`;
};
