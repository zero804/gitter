"use strict";

function renderForum(req, res){
  res.render('topics/forum', {
    layout: 'topics-layout',
    groupName: req.params.roomPart1,
  });
}

module.exports = {
  renderForum: renderForum,
};
