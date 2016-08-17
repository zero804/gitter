'use strict';

const React = require('react');
const Backbone = require('backbone');
const ForumContainer = require('../../containers/ForumContainer.jsx');
const CategoryStore = require('./stores/forum-category-store');
const TagStore = require('./stores/forum-tag-store');
const navConstatnts = require('./constants/navigation');

module.exports = React.createClass({

  displayName: 'App',

  propTypes: {
    //System router
    router: React.PropTypes.shape({
      get: React.PropTypes.func.isRequired,
      set: React.PropTypes.func.isRequired,
    })
  },

  getInitialState(){
    const { router } = this.props;
    switch(router.get('route')) {
      case navConstatnts.FORUM_ROUTE: return this.getForumState();
    }
  },

  render(){
    const { route } = this.state;
    switch(route) {
      case navConstatnts.FORUM_ROUTE: return <ForumContainer {...this.state} />
    }
  },

  getDefaultState(){
    const { router } = this.props;
    return { route: router.get('route') };
  },

  getForumState(){
    const categoryStore = (window.context.categoryStore || {});
    const tagStore = (window.context.tagStore || {});
    const { router } = this.props;

    return Object.assign(this.getDefaultState(), {
      groupName: router.get('groupName'),
      categoryName: router.get('categoryName'),
      filterName: router.get('filterName'),
      tagName: router.get('tagName'),
      sortName: router.get('sortName'),
      categoryStore: new CategoryStore(categoryStore.models, { router: router }),
      tagStore: new TagStore(tagStore.models, { router: router }),
    });
  }

});
