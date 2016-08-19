import React from 'react';

//Containers
import ForumContainer from '../../shared/containers/ForumContainer.jsx';
import TopicContainer from '../../shared/containers/TopicContainer.jsx';

//Stores
import CategoryStore from './stores/forum-category-store';
import TagStore from './stores/forum-tag-store';
import TopicsStore from './stores/topics-store';
import NewTopicStore from './stores/new-topic-store';
import ForumStore from './stores/forum-store';
import AccessTokenStore from './stores/access-token-store';

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
      case navConstants.TOPIC_ROUTE: return this.getTopicState();
    }
  },

  render(){
    const { route } = this.state;
    switch(route) {
      case navConstants.FORUM_ROUTE: return <ForumContainer {...this.state} />;
      case navConstants.CREATE_TOPIC_ROUTE: return <ForumContainer {...this.state} />;
      case navConstants.TOPIC_ROUTE: return <TopicContainer {...this.state} />;
    }
  },

  getDefaultState(){
    const { router } = this.props;
    const accessTokenStore = new AccessTokenStore({ accessToken: window.context.accessTokenStore.token });
    console.log(accessTokenStore);
    return { route: router.get('route'), router: router, accessTokenStore: accessTokenStore };
  },

  getForumState(){
    //This doesn't get passed to components it just backs the other stores
    const forumStore = new ForumStore(window.context.forumStore.data);

    //Pull data out of the context
    const categoryStore = (window.context.categoryStore || {});
    const tagStore = (window.context.tagStore || {});
    const topicsStore = (window.context.topicsStore || {});

    //Pull objects out of props
    const { router } = this.props;

    const defaults = this.getDefaultState();

    //Construct State
    return Object.assign(defaults, {
      groupName: router.get('groupName'),
      categoryName: router.get('categoryName'),
      filterName: router.get('filterName'),
      tagName: router.get('tagName'),
      sortName: router.get('sortName'),
      categoryStore: new CategoryStore(categoryStore.models, { router: router, forumStore: forumStore }),
      tagStore: new TagStore(tagStore.models, { router: router, forumStore: forumStore }),
      topicsStore: new TopicsStore(topicsStore.models, {
        router: router,
        forumStore: forumStore,
        accessTokenStore: defaults.accessTokenStore
      }),
      newTopicStore: new NewTopicStore(),
    });
  },

  getCreateTopicState(){
    const { router } = this.props;
    return Object.assign(this.getForumState(), {
      createTopic: router.get('createTopic'),
    });
  },

  getTopicState(){
    const { router } = this.props;

    const topicsStore = (window.context.topicsStore || {});
    const topicId = (window.context.topicId || 0);

    return Object.assign(this.getDefaultState(), {
      groupName: router.get('groupName'),
      topicsStore: new TopicsStore(topicsStore.models, { router: router }),
      topicId: topicId,
    });
  },

});
