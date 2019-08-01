'use strict';

require('./utils/webpack');
require('gitter-web-client-context');

require('./utils/log');
require('./components/api-client');

// Polyfills
require('core-js/stable/object/assign');
require('core-js/stable/object/values');
