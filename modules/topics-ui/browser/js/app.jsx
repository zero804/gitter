import React from 'react';
import ForumContainer from '../../shared/containers/ForumContainer.jsx';
import CategoryStore from './stores/forum-category-store';
import TagStore from './stores/forum-tag-store';
import * as navConstatnts from '../../shared/constants/navigation';


export default React.createClass({

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
    return { route: router.get('route'), router: router };
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
