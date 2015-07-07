def d = ctx.document;

if(d.status == 'DELETED') {
  ctx.deleted = true;
}

ctx.document = [
  _id: d._id,
  uri: d.uri,
  security: d.security,
  githubType: d.githubType,
  parentId: d.parentId,
  ownerUserId: d.ownerUserId,
  topic: d.topic,
  tags: d.tags,
  userCount: d.userCount
];
