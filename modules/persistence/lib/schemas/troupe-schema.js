"use strict";

var mongoose       = require('gitter-web-mongoose-bluebird');
var Schema         = mongoose.Schema;
var ObjectId       = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

module.exports = {
  install: function(mongooseConnection) {

    //
    // Banned from the room
    //
    var TroupeBannedUserSchema = new Schema({
      userId: { type: ObjectId },
      dateBanned: { type: Date, "default": Date.now },
      bannedBy: { type: ObjectId }
    });
    TroupeBannedUserSchema.schemaTypeName = 'TroupeBannedUserSchema';
    var TroupeBannedUser = mongooseConnection.model('TroupeBannedUser', TroupeBannedUserSchema);

    //
    // User in a Troupe
    //
    var TroupeOneToOneUserSchema = new Schema({
      userId: { type: ObjectId }
    });
    TroupeOneToOneUserSchema.schemaTypeName = 'TroupeOneToOneUserSchema';

    //
    // A Troupe
    //
    var TroupeSchema = new Schema({
      topic: { type: String, 'default':'' },
      uri: { type: String },
      tags: [String],
      lcUri: { type: String, 'default': function() { return this.uri ? this.uri.toLowerCase() : null; }  },
      githubType: { type: String, 'enum': ['REPO', 'ORG', 'ONETOONE', 'REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL'], required: true },
      lcOwner: { type: String, 'default': function() { return this.uri ? this.uri.split('/')[0].toLowerCase() : null; } },
      status: { type: String, "enum": ['ACTIVE', 'DELETED'], "default": 'ACTIVE'},  // DEPRECATED. TODO: remove this
      oneToOne: { type: Boolean, "default": false },
      oneToOneUsers: [TroupeOneToOneUserSchema],
      /** Note: USER COUNT MAY NOT BE UP TO DATE. ONLY USE IT FOR QUERIES, NOT FOR ITERATION ETC. */
      userCount: { type: Number, 'default': function() { return this.oneToOne ? 2 : 0; } },
      bans: [TroupeBannedUserSchema],
      parentId: { type: ObjectId, required: false },
      ownerUserId: { type: ObjectId, required: false }, // For channels under a user /suprememoocow/custom
      security: { type: String, /* WARNING: validation bug in mongo 'enum': ['PRIVATE', 'PUBLIC', 'INHERITED'], required: false */ }, // For REPO_CHANNEL, ORG_CHANNEL, USER_CHANNEL
      dateDeleted: { type: Date },
      dateLastSecurityCheck: { type: Date },
      noindex: { type: Boolean, 'default': false},
      githubId: { type: Number, default: null },
      lang: { type: String }, // Human language of this room
      renamedLcUris: [String],
      providers: [String],
      _nonce: { type: Number },
      _tv: { type: 'MongooseNumber', 'default': 0 }
    }, { strict: 'throw' });

    TroupeSchema.schemaTypeName = 'TroupeSchema';

    TroupeSchema.path('security').validate(function (value) {
      return !value || value === 'PRIVATE' || value === 'PUBLIC' || value === 'INHERITED';
    }, 'Invalid security');

    // Ideally we should never search against URI, only lcURI
    TroupeSchema.index({ uri: 1 }, { unique: true, sparse: true });
    TroupeSchema.index({ lcUri: 1 }, { unique: true, sparse: true });
    TroupeSchema.index({ githubId: 1 }, { /* XXX we cannot make this unique as there may be duplicates in existing data unfortunately */ });
    TroupeSchema.index({ renamedLcUris: 1 });
    TroupeSchema.index({ parentId: 1 });
    TroupeSchema.index({ lcOwner: 1 });
    TroupeSchema.index({ ownerUserId: 1 });
    TroupeSchema.index({ lcUri: 1 }, { unique: true, sparse: true });

    TroupeSchema.index({ "oneToOneUsers.userId": 1 });
    
    installVersionIncMiddleware(TroupeSchema);

    TroupeSchema.pre('save', function (next) {
      this.lcUri =  this.uri ? this.uri.toLowerCase() : undefined;
      next();
      // Put this somewhere when it finds a better home
      // if (this.security !== 'PUBLIC') return next();
      // if (this.)
      // if(this.security !== 'PUBLIC' || this.tags && this.tags.length) {
      //   // not worth tagging, or already tagged.
      //   return next();
      // }
      //
      // /* Don't tag test repos */
      // if(this.githubType === 'REPO' && this.uri.indexOf("_test_") !== 0) {
      //   var repoService = new RepoService(this.users[0]);
      //   var self = this;
      //
      //   return repoService.getRepo(this.uri)
      //     .then(function(repo) {
      //       assert(repo, 'repo lookup failed');
      //
      //       self.tags = tagger(self, repo);
      //     })
      //     .catch(function(err) {
      //       winston.warn('repo lookup or tagging failed for ' + this.uri + ' , skipping tagging for now', { exception: err });
      //     })
      //     .finally(function() {
      //       next();
      //     });
      //
      // }
      //
      // this.tags = tagger(this);
      // next();
    });

    TroupeSchema.methods.addUserBan = function(options) {
      // TODO: add some asserts here
      var ban = new TroupeBannedUser(options);
      this.bans.push(ban);
      return ban;
    };

    var Troupe = mongooseConnection.model('Troupe', TroupeSchema);

    return {
      model: Troupe,
      schema: TroupeSchema
    };
  }
};
