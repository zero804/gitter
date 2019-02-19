'use strict';

require('./utils/webpack');
require('./utils/context');

require('./utils/log');
require('./components/api-client');

// Polyfills
require('core-js/fn/object/assign');
