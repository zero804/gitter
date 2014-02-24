/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;

//
// Settings for a user for a troupe
//
var UserSettingsSchema = new Schema({
  userId:   ObjectId,
  settings: Schema.Types.Mixed
});
UserSettingsSchema.index({ userId: 1 }, { unique: true });
UserSettingsSchema.schemaTypeName = 'UserSettingsSchema';

exports = UserSettingsSchema;
