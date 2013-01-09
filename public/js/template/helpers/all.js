require(['handlebars'],
  function(Handlebars) {

  // -------------------------------------------------------
  // Widget helper
  // -------------------------------------------------------

  function widget(widgetName, model) {
    if(!this.renderViews) {
      this.renderViews = [];
    }

    this.renderViews.push({
      widgetName: widgetName,
      model: model.hash
    });

    return new Handlebars.SafeString("<view data-id='" + (this.renderViews.length - 1) + "'></view>");
  }

  Handlebars.registerHelper('widget', widget);

  // -------------------------------------------------------
  // CDN helper
  // -------------------------------------------------------

  function cdn(url, model) {
    return "/" + url;
  }

  Handlebars.registerHelper('cdn', cdn);

  function dialogFragment(fragment) {
    var currentFragment = window.location.hash.split('|', 1);
    return currentFragment[0] + "|" + fragment;
  }

  Handlebars.registerHelper('dialogFragment', dialogFragment);

  return null;
});