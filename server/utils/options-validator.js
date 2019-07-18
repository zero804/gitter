'use strict';

const logger = require('gitter-web-env').logger;
const _ = require('lodash');

/**
 * createOptionsValidator creates a function that will accept options and
 * log out all unexpected key-value pairs in those options
 *
 * @param {String} validatorName unique name for identifying log messages
 * @param {Array<String>} expectedOptionNames allowed options, all other
 *     options are going to be warnings in logs
 */
const createOptionsValidator = (validatorName, expectedOptionNames) => options => {
  const allOptionNames = Object.keys(options);
  const unexpectedOptionNames = _.difference(allOptionNames, expectedOptionNames);
  if (!_.isEmpty(unexpectedOptionNames)) {
    const unexpectedOptions = _.pick(options, unexpectedOptionNames);
    logger.warn(`unexpected options - ${validatorName} - ${JSON.stringify(unexpectedOptions)}`);
  }
};

module.exports = { createOptionsValidator };
