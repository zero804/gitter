'use strict';

const moment = require('moment');

module.exports = (basePath, troupeName, id, sent, isArchive) => {
  if (isArchive) {
    const urlDate = moment(sent).format('YYYY/MM/DD');
    return `${basePath}/${troupeName}/archives/${urlDate}/?at=${id}&timestamp=${moment(
      sent
    ).toISOString()}`;
  }
  return `${basePath}/${troupeName}?at=${id}`;
};
