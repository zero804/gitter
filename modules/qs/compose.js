'use strict';

/**
 * Generates query string from object with parameters. Omits undefined properties.
 *
 * compose({foo: 'bar', hey: 'hello}) = '?foo=bar&hey=hello'
 * compose({foo: 'bar', hey: undefined}) = '?foo=bar'
 * compose({}) = ''
 */
module.exports = parameters => {
  const concatParams = Object.keys(parameters)
    .filter(key => parameters[key] !== undefined)
    .map(key => key + '=' + parameters[key])
    .join('&');
  return concatParams ? '?' + concatParams : '';
};
