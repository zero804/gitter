'use strict';

function FallbackPolicyEvaluator(primary, secondary) {
  this.primary = primary;
  this.secondary = secondary;
}

FallbackPolicyEvaluator.prototype = {
  canRead: function() {
    return this.primary.canRead()
      .bind(this)
      .then(function(access) {
        if (access) return true;
        return this.secondary.canRead();
      });
  },

  canWrite: function() {
    return this.primary.canWrite()
      .bind(this)
      .then(function(access) {
        if (access) return true;
        return this.secondary.canWrite();
      });
  },

  canJoin: function() {
    return this.primary.canJoin()
      .bind(this)
      .then(function(access) {
        if (access) return true;
        return this.secondary.canJoin();
      });
  },

  canAdmin: function() {
    return this.primary.canAdmin()
      .bind(this)
      .then(function(access) {
        if (access) return true;
        return this.secondary.canAdmin();
      });
  },

  canAddUser: function() {
    return this.primary.canAddUser()
      .bind(this)
      .then(function(access) {
        if (access) return true;
        return this.secondary.canAddUser();
      });
  },

};

module.exports = FallbackPolicyEvaluator;
