/**
 * Module dependencies.
 */
var passport = require('passport')
  , util = require('util');


function Strategy(options, verify) {
  if (typeof options == 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('local authentication strategy requires a verify function');
  
  passport.Strategy.call(this);
  this.name = 'confirm';
  this.verify = verify;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);


Strategy.prototype.authenticate = function(req) {
  if (!req.params.confirmationCode) {
    return this.fail();
  }
  
  var confirmationCode = req.params.confirmationCode;
  
  var self = this;
  this.verify(confirmationCode, function(err, user) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(); }
    self.success(user);
  });
}

/**
 * Expose `Strategy`.
 */ 
module.exports = {
    Strategy: Strategy
}
