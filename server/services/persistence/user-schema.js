"use strict";

var mongoose = require('../../utils/mongoose-q');
var userScopes = require('../../utils/models/user-scopes');
var Schema   = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var assert   = require('assert');

var ProviderKeySchema = new Schema({
  provider: { type: String },
  providerKey: { type: String },
});

ProviderKeySchema.schemaTypeName = 'ProviderKeySchema';

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
  gravatarVersion: { type: String },
  lastTroupe: ObjectId,
  googleRefreshToken: String,
  githubToken: { type: String },
  githubUserToken: { type: String }, // The scope for this token will always be 'user'
  githubId: {type: Number },
  identities: [ProviderKeySchema],
  permissions: {
    createRoom: { type: Boolean, 'default': true }
  },
  staff: { type: Boolean },
  hellbanned: { type: Boolean }, // to troll the trolls
  githubScopes: { type: Schema.Types.Mixed },
  state: { type: String },
  stripeCustomerId: { type: String },
  tz: {
    offset: Number, // Offset in minutes as provided by `Date.prototype.getTimezoneOffset()`
    abbr: String,   // Abbreviation, like PDT (note that these are NOT globally unique)
    iana: String    // Timezone IANA description, eg `Europe/London` or `America/Los_Angeles`
  },
  _tv: { type: 'MongooseNumber', 'default': 0 }
});

UserSchema.index({ githubId: 1 }, { unique: true, sparse: true }); // TODO: does this still need to be sparse?
UserSchema.index({'identities.provider': 1, 'identities.providerKey': 1}, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true /*, sparse: true */});
UserSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
UserSchema.schemaTypeName = 'UserSchema';

UserSchema.methods.hasGitHubScope = function(scope) {
  return userScopes.hasGitHubScope(this, scope);
};

UserSchema.methods.getGitHubScopes = function() {
  return userScopes.getGitHubScopes(this);
};

UserSchema.methods.getGitHubToken = function(scope) {
  return userScopes.getGitHubToken(this, scope);
};

UserSchema.methods.isMissingTokens = function() {
  return userScopes.isMissingTokens(this);
};

UserSchema.methods.clearTokens = function() {
  this.githubToken = null;
  this.githubScopes = { };
  this.githubUserToken = null;
};


UserSchema.methods.getDisplayName = function() {
  return this.displayName || this.username;
};

/* TODO: deprecate */
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

UserSchema.methods.getHomeUrl = function() {
  return '/' +  this.username;
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

    // do we need this?
    //var ProviderKey = mongooseConnection.model('ProviderKey', ProviderKeySchema);

    return {
      model: model,
      schema: UserSchema
    };
  }
};
