'use strict'

module.exports = function redirectAfterLogin(req, res) {
  if (req.session && req.session.githubScopeUpgrade) {
    delete req.session.githubScopeUpgrade;
    res.render('github-upgrade-complete');
    return;
  }

  if (req.session && req.session.returnTo) {
    res.redirect(req.session.returnTo);
    return;
  }

  var user = req.user;
  if (user) {
    res.redirect('/' + user.username);
  } else {
    res.redirect('/');
  }
}
