
module.exports = {
    install: function(app) {
      app.get('/confirm', function(req, res) {
        res.render('confirm', {
        });
      });
    }
};