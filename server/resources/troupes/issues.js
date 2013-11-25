/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  index: function(req, res) {
    var term = req.query.q || '';
    var matches = [
      {number:12, title:'<script>alert();</script>'},
      {number:111, title:'PC LOAD LETTER'},
      {number:113, title:'No keyboard detected. Press F1 to resume.'},
      {number:121, title:'I’m Sorry Dave, I’m afraid I can’t do that.'},
      {number:122, title:'Really long descriptions are a fantastic way to test how the autocomplete behaves'},
      {number:123, title:'EVERYTHING IS BROKEN'},
      {number:124, title:'EVERYTHING IS BROKEN'},
      {number:125, title:'EVERYTHING IS BROKEN'},
      {number:126, title:'EVERYTHING IS BROKEN'},
      {number:127, title:'EVERYTHING IS BROKEN'},
      {number:128, title:'EVERYTHING IS BROKEN'},
      {number:223, title:'Not a Typewriter'},
      {number:567, title:'You don’t exist. Go away.'}
    ].filter(function(issue) {
      return (''+issue.number).indexOf(term) === 0;
    });
    res.send(matches);
  }
};
