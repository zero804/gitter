/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;

/*
 * Subscriptions
 */
var SubscriptionSchema = new Schema({
  userId: ObjectId,
  uri: String,
  lcUri: String,
  plan: String,
  subscriptionType: { type: String, required: true, "enum": ['USER', 'ORG'] },
  status: { type: String, required: true, "enum": ['CURRENT', 'ARCHIVED'], default: 'CURRENT' },
});

SubscriptionSchema.index({ userId: 1 }, { unique: false });
SubscriptionSchema.index({ userId: 1, plan: 1 }, { unique: false });
SubscriptionSchema.index({ lcUri: 1 }, { unique: true });
SubscriptionSchema.schemaTypeName = 'SubscriptionSchema';

exports = SubscriptionSchema;