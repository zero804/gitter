
import Backbone from 'backbone';
import { subscribe } from 'gitter-web-topics-ui/shared/dispatcher';
import navConstants from 'gitter-web-topics-ui/shared/constants/navigation';

var RouteModel = Backbone.Model.extend({
  defaults: { route: null }
});

var Router = Backbone.Router.extend({

  constructor: function() {
    this.model = new RouteModel();
    subscribe(navConstants.NAVIGATE_TO, this.navigateTo, this);
    Router.__super__.clone.apply(this, arguments);

    Backbone.Router.prototype.constructor.call(this, ...arguments);
  },

  routes: {
    ':groupName/topics(/)': 'forums',
    ':groupName/topics/categories/:categoryName(/)': 'forums'
  },

  forums(groupName, categoryName){
    categoryName = (categoryName || 'all');
    this.model.set({
      route: 'forum' ,
      groupName: groupName,
      categoryName: categoryName,
    });
  },

  navigateTo(data){
    switch(data.route) {
      case 'forum': return this.navigateToForum(data);
    }
  },

  navigateToForum(data = { category: 'all' }){

    const { category } = data;

    var url = (data.category === 'all') ?
      `/${this.model.get('groupName')}/topics` :
      `/${this.model.get('groupName')}/topics/categories/${category}`;

    this.navigate(url, { trigger: true, replace: true });
  }

});

var router = new Router();

export default router.model;
