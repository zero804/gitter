'use strict';

const React = require('react');
const Backbone = require('backbone');
const ForumContainer = require('../../containers/ForumContainer.jsx');
const CategoryStore = require('./stores/forum-category-store');
const router = require('./routers/index');

Backbone.history.start({ pushState: true });

module.exports = React.createClass({

  getInitialState(){
    switch(router.get('route')) {
      case 'forum': return this.getForumState();
    }
  },

  render(){
    switch(router.get('route')) {
      case 'forum': return <ForumContainer {...this.state} />
    }
  },

  getForumState(){
    const categoryStore = (window.context.categoryStore || {});
    return {
      groupName: router.get('groupName'),
      categoryStore: new CategoryStore(categoryStore.models),
    };
  }

});
