import React from 'react';
import ForumContainer from '../../shared/containers/ForumContainer.jsx';
import CategoryStore from './stores/forum-category-store';
import TagStore from './stores/forum-tag-store';
import TopicsStore from './stores/topics-store';
import * as navConstants from '../../shared/constants/navigation';


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
      case navConstants.FORUM_ROUTE: return this.getForumState();
      case navConstants.CREATE_TOPIC_ROUTE: return this.getCreateTopicState();
    }
  },

  render(){
    const { route } = this.state;
    switch(route) {
      case navConstants.FORUM_ROUTE: return <ForumContainer {...this.state} />
      case navConstants.CREATE_TOPIC_ROUTE: return <ForumContainer {...this.state} />;
    }
  },

  getDefaultState(){
    const { router } = this.props;
    return { route: router.get('route'), router: router };
  },

  getForumState(){
    const categoryStore = (window.context.categoryStore || {});
    const tagStore = (window.context.tagStore || {});
    const topicsStore = (window.context.topicsStore || {});
    const { router } = this.props;

    return Object.assign(this.getDefaultState(), {
      groupName: router.get('groupName'),
      categoryName: router.get('categoryName'),
      filterName: router.get('filterName'),
      tagName: router.get('tagName'),
      sortName: router.get('sortName'),
      categoryStore: new CategoryStore(categoryStore.models, { router: router }),
      tagStore: new TagStore(tagStore.models, { router: router }),
      topicsStore: new TopicsStore(topicsStore.models, { router: router })
    });
  },

  getCreateTopicState(){
    const { router } = this.props;
    return Object.assign(this.getForumState(), {
      createTopic: router.get('createTopic'),
    });
  }

});
