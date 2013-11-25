/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  index: function(req, res) {
    var term = req.query.q || '';
    var matches = [
      {
        id: '1234',
        description: 'PC LOAD LETTER'
      },
      {
        id: '1235',
        description: 'No keyboard detected. Press F1 to resume.'
      }
    ].filter(function(issue) {
      return issue.id.indexOf(term) === 0;
    });
    res.send(matches);
  }
};
