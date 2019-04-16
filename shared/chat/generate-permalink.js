'use strict';

const moment = require('moment');
const urlJoin = require('url-join');
const clientEnv = require('gitter-client-env');

module.exports = (troupeName, id, sent, isArchive) => {
  const basePath = clientEnv['basePath'];
  if (isArchive) {
    const urlDate = moment(sent).format('YYYY/MM/DD');
    return urlJoin(basePath, troupeName, 'archives', urlDate, `?at=${id}`);
  }
  return urlJoin(basePath, troupeName, `?at=${id}`);
};
