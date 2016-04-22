var result = db.chatmessages.aggregate([{
    $group: {
      _id: "$toTroupeId",
      chatCount: { $sum: 1 }
    },
  }, {
    $lookup: {
      from: "troupes",
      localField: "_id",
      foreignField: "_id",
      as: "troupe"
    }
  }, {
    $unwind: "$troupe"
  }, {
    $project: {
      _id: 0,
      lcOwner: { $cond: { if: { $eq: [ "$troupe.githubType", "ORG" ] }, then: "$troupe.lcUri", else: "$troupe.lcOwner" } },
      chatCount: 1
    }
  },{
    $group: {
      _id: "$lcOwner",
      chatCount: { $sum: "$chatCount" }
    },
  },{
    $sort: {
      chatCount: -1
    },
  },{
    $limit: 100
  }]);
result.forEach(function(x) {
  print('|' + x._id + '|' + x.chatCount + '|')
})
