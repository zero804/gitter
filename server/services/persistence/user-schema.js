"use strict";

var mongoose = require('../../utils/mongoose-q');
var Schema   = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var assert   = require('assert');

var UserSchema = new Schema({
  displayName: { type: String },
  emails: [String],                            // Secondary email addresses
  invitedEmail: { type: String },
  inviteReminderSent: { type: Date },
  invitedByUser: ObjectId,
  invitedToRoom: ObjectId,
  username: { type: String, required: true },
  confirmationCode: {type: String },
  gravatarImageUrl: { type: String },
  lastTroupe: ObjectId,
  googleRefreshToken: String,
  githubToken: { type: String },
  githubUserToken: { type: String }, // The scope for this token will always be 'user'
  githubId: {type: Number },
  permissions: {
    createRoom: { type: Boolean, 'default': true }
  },
  githubScopes: { type: Schema.Types.Mixed },
  state: { type: String },
  stripeCustomerId: { type: String },
  _tv: { type: 'MongooseNumber', 'default': 0 }
});

UserSchema.index({ githubId: 1 }, { unique: true, sparse: true }); // TODO: does this still need to be sparse?
UserSchema.index({ username: 1 }, { unique: true /*, sparse: true */});
UserSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
UserSchema.schemaTypeName = 'UserSchema';

var LEGACY_DEFAULT_SCOPE = {'user': 1, 'user:email': 1, 'user:follow':1, 'repo':1, 'public_repo': 1};

UserSchema.methods.hasGitHubScope = function(scope) {
  var githubToken = this.githubToken;
  var githubScopes = this.githubScopes;
  var githubUserToken = this.githubUserToken;

  if(!githubUserToken && !githubToken) {
    return false;
  }

  // Get the simple case out the way
  if(githubUserToken && (scope === 'user' ||
             scope === 'user:email'||
             scope === 'user:follow')) {
    return true;
  }

  function hasScope() {
    for(var i = 0; i < arguments.length; i++) {
      if(githubScopes[arguments[i]]) return true;
    }
    return false;
  }

  if(!githubScopes) {
    if(githubToken) {
      return !!LEGACY_DEFAULT_SCOPE[scope];
    }
    // Legacy users will need to reauthenticate unfortunately
    return false;
  }

  // Crazy github rules codified here....
  switch(scope) {
    case 'notifications': return hasScope('notifications', 'repo');
    case 'user:follow': return hasScope('user:follow', 'user');
    case 'user:email': return hasScope('user:email', 'user');
    case 'public_repo': return hasScope('public_repo', 'repo');
    case 'repo:status': return hasScope('repo:status', 'repo');
  }

  // The less crazy case
  return !!githubScopes[scope];
};

UserSchema.methods.getGitHubScopes = function() {
  if(!this.githubScopes) {
    if(this.githubUserToken) {
      return Object.keys(LEGACY_DEFAULT_SCOPE);
    } else {
      return [];
    }
  }

  var scopes = Object.keys(this.githubScopes);
  if(!this.githubUserToken) {
    return scopes;
  }

  return scopes.concat(['user', 'user:email', 'user:follow']);
};

UserSchema.methods.getGitHubToken = function(scope) {
  if(!scope) return this.githubToken || this.githubUserToken;

  switch(scope) {
    case 'user':
    case 'user:email':
    case 'user:follow':
      return this.githubUserToken || this.githubToken;
  }

  return this.githubToken || this.githubUserToken;
};


UserSchema.methods.isMissingTokens = function() {
  return !this.githubToken && !this.githubUserToken;
};


UserSchema.methods.destroyTokens = function() {
  this.githubToken = null;
  this.githubScopes = { };
  this.githubUserToken = null;
};


UserSchema.methods.getDisplayName = function() {
  return this.displayName || this.username || "Unknown";
};

UserSchema.methods.getFirstName = function() {
  if(this.displayName) {
    var firstName = this.displayName.split(/\s+/)[0];
    if(firstName) return firstName;
  }

  if(this.username) {
    return this.username;
  }

  if(this.email) {
    return this.email.split('@')[0];
  }

  return "Unknown";
};


UserSchema.methods.getAllEmails = function() {
  return [this.email].concat(this.emails);
};

UserSchema.methods.getHomeUri = function() {
  return this.username ? this.username : "one-one/" + this.id;
};

UserSchema.methods.getHomeUrl = function() {
  return '/' + this.getHomeUri();
};

UserSchema.methods.isConfirmed = function() {
  assert(this.status, 'User object does not have a status attribute. Did you select this field?');
  return this.status !== 'UNCONFIRMED';
};

UserSchema.methods.hasUsername = function() {
  return !!this.username;
};

UserSchema.methods.hasPassword = function() {
  return !!this.passwordHash;
};

UserSchema.methods.hasEmail = function(email) {
  return this.email === email || this.emails.some(function(e) { return e === email; });
};

// Returns true if the user is not INVITED or REMOVED
UserSchema.methods.isActive = function() {
  return !this.state;
};

UserSchema.methods.isInvited = function() {
  return this.state === 'INVITED';
};

UserSchema.methods.isRemoved = function() {
  return this.state === 'REMOVED';
};


module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('User', UserSchema);

    return {
      model: model,
      schema: UserSchema
    };
  }
};
