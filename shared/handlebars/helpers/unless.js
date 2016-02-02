'use strict';

// via: https://github.com/emberjs/ember.js/blob/v2.3.0/packages/ember-htmlbars/lib/helpers/if_unless.js

/**
  The `unless` helper is the inverse of the `if` helper. Its block will be
  rendered if the expression contains a falsey value.  All forms of the `if`
  helper can also be used with `unless`.
  @method unless
  @for Ember.Templates.helpers
  @public
*/
function unlessHelper(params, hash, options) {
  params = params || [];
  return !params[0] ? params[1] : params[2]
}


module.exports = unlessHelper;
