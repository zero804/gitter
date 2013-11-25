/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  index: function(req, res) {
    var term = req.query.q || '';
    var matches = [
      {id:'1111', description:'PC LOAD LETTER'},
      {id:'1234', description:'No keyboard detected. Press F1 to resume.'},
      {id:'12', description:'<script>alert();</script>'},
      {id:'5678', description:'You don’t exist. Go away.'},
      {id:'223', description:'Not a Typewriter'},
      {id:'121', description:'I’m Sorry Dave, I’m afraid I can’t do that.'},
      {id:'122', description:'Really long descriptions are a fantastic way to test how the autocomplete behaves'},
      {id:'123', description:'EVERYTHING IS BROKEN'},
      {id:'124', description:'EVERYTHING IS BROKEN'},
      {id:'125', description:'EVERYTHING IS BROKEN'},
      {id:'126', description:'EVERYTHING IS BROKEN'},
      {id:'127', description:'EVERYTHING IS BROKEN'},
      {id:'128', description:'EVERYTHING IS BROKEN'}
    ].filter(function(issue) {
      return issue.id.indexOf(term) === 0;
    });
    res.send(matches);
  }
};
