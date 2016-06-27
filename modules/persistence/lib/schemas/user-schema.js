"use strict";

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

var ProviderKeySchema = new Schema({
  provider: { type: String },
  providerKey: { type: String },
});

ProviderKeySchema.schemaTypeName = 'ProviderKeySchema';

var UserSchema = new Schema({
  displayName: { type: String },
  emails: [String],                            // Secondary email addresses
  invitedEmail: { type: String },
  username: { type: String, required: true },
  gravatarImageUrl: { type: String },
  gravatarVersion: { type: String },
  lastTroupe: ObjectId,
  googleRefreshToken: String,
  githubToken: { type: String },
  githubUserToken: { type: String }, // The scope for this token will always be 'user'
  githubId: {type: Number },
  identities: [ProviderKeySchema],
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
  defaultFlags: { type: Number }, // Default flags for room membership
  _tv: { type: 'MongooseNumber', 'default': 0 }
}, { strict: 'throw' });

UserSchema.index({ githubId: 1 }, { unique: true, sparse: true }); // TODO: does this still need to be sparse?
UserSchema.index({'identities.provider': 1, 'identities.providerKey': 1}, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true /*, sparse: true */});
UserSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
UserSchema.schemaTypeName = 'UserSchema';

installVersionIncMiddleware(UserSchema);

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
