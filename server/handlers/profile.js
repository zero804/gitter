var form = require("express-form"),
    filter = form.filter,
    validate = form.validate;

module.exports = {
    install: function(app) {
      app.get('/profile', function(req, res) {
        res.render('profile', {
        });
      });      
    }
};