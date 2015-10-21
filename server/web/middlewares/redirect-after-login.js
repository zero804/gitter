'use strict'

module.exports = function redirectAfterLogin(req, res) {
  if (req.session && req.session.githubScopeUpgrade) {
    delete req.session.githubScopeUpgrade;
    res.render('github-upgrade-complete');
    return;
  }

  if (req.session && req.session.returnTo) {
    if (req.session.returnTo.indexOf('callback') == -1) {
      res.redirect(req.session.returnTo);
      return;
    } else {
      delete req.session.returnTo;
    }
  }

  var user = req.user;
  if (user) {
    res.redirect('/' + user.username);
  } else {
    res.redirect('/');
  }
}
