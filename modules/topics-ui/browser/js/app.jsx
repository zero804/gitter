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
import {RepliesStore} from './stores/replies-store';
import CurrentUserStore from './stores/current-user-store';
import NewReplyStore from './stores/new-reply-store';

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

  componentDidMount(){
    const {router} = this.props;
    router.on('change:route', this.onRouteUpdate, this);
    this.hasRendered = true;
  },

  componentWillUnmount(){
    const {router} = this.props;
    router.off('change:route', this.onRouteUpdate, this);
  },

  getInitialState(){
    return this.getStateForRoute();
  },

  render(){
    const { route } = this.state;
    switch(route) {
      case navConstants.FORUM_ROUTE: return <ForumContainer {...this.state} />;
      case navConstants.CREATE_TOPIC_ROUTE: return <ForumContainer {...this.state} />;
      case navConstants.TOPIC_ROUTE: return <TopicContainer {...this.state} />;
    }
  },

  //STATE -----------------------------------
  getStateForRoute(){
    const { router } = this.props;
    switch(router.get('route')) {
      case navConstants.FORUM_ROUTE: return this.getForumState();
      case navConstants.CREATE_TOPIC_ROUTE: return this.getCreateTopicState();
      case navConstants.TOPIC_ROUTE: return this.getTopicState();
    }
  },

  getDefaultState(){
    const { router } = this.props;
    return {
      groupName: router.get('groupName'),
      route: router.get('route'),
      router: router,
      accessTokenStore: this.getAccessTokenStore(),
      currentUserStore: this.getCurrentUserStore(),
    };
  },

  getForumState(){
    const { router } = this.props;
    const defaults = this.getDefaultState();

    //Construct State
    return Object.assign(defaults, {

      //Route params
      categoryName: router.get('categoryName'),
      filterName: router.get('filterName'),
      tagName: router.get('tagName'),
      sortName: router.get('sortName'),

      //Stores
      forumStore: this.getForumStore(),
      categoryStore: this.getCategoryStore(),
      tagStore: this.getTagStore(),
      topicsStore: this.getTopicsStore(),
      newTopicStore: new NewTopicStore(),
      createTopic: false,
    });
  },

  getCreateTopicState(){
    const { router } = this.props;
    return Object.assign(this.getForumState(), {
      createTopic: router.get('createTopic'),
    });
  },

  getTopicState(){
    var {router} = this.props;
    const topicId = router.get('topicId');
    const topicsStore = this.getTopicsStore();
    const repliesStore = this.getRepliesStore();

    return Object.assign(this.getDefaultState(), {
      groupName: router.get('groupName'),
      topicId: router.get('topicId'),
      topicsStore: topicsStore,
      repliesStore: repliesStore,
      categoryStore: this.getCategoryStore(),
      newReplyStore: new NewReplyStore(),
    });
  },

  //STORES -------------------------------
  getAccessTokenStore(){
    const accessTokenStore = (window.context.accessTokenStore || {});
    if(this.hasRendered && this.state.accessTokenStore) { return this.state.accessTokenStore }
    return new AccessTokenStore({ accessToken: accessTokenStore.token });
  },

  getCurrentUserStore(){
    const currentUserStore = (window.context.currentUserStore || {});
    if(this.hasRendered && this.state.currentUserStore) { return this.state.currentUserStore }
    return new CurrentUserStore(currentUserStore.data);
  },

  getForumStore(){
    const forumStore = (window.context.forumStore || {});
    if(this.hasRendered && this.state.forumStore) { return this.state.forumStore; }
    return new ForumStore(forumStore.data);
  },

  getCategoryStore(){
    const {router} = this.props;
    const forumStore = this.getForumStore();
    const categoryStore = (window.context.categoryStore || {});

    if(this.hasRendered && this.state.categoryStore) { return this.state.categoryStore; }
    return new CategoryStore(categoryStore.models, { router: router, forumStore: forumStore });
  },

  getTagStore(){
    const {router} = this.props;
    const forumStore = this.getForumStore();
    const tagStore = (window.context.tagStore || {});

    if(this.hasRendered && this.state.tagStore) { return this.state.tagStore; }
    return new TagStore(tagStore.models, { router: router, forumStore: forumStore });
  },

  getTopicsStore(){
    const {router} = this.props;
    const accessTokenStore = this.getAccessTokenStore();
    const forumStore = this.getForumStore();
    const topicsStore = (window.context.topicsStore || {});

    if(this.hasRendered && this.state.topicsStore) { return this.state.topicsStore; }
    return new TopicsStore(topicsStore.models, {
      router: router,
      accessTokenStore: accessTokenStore,
      forumStore: forumStore,
    });
  },

  getRepliesStore(){

    const {router} = this.props;
    const repliesStore = (window.context.repliesStore || {});
    const accessTokenStore = this.getAccessTokenStore();
    const forumStore = this.getForumStore();
    const topicsStore = this.getTopicsStore();
    const currentUserStore = this.getCurrentUserStore();

    if(this.hasRendered && this.state.repliesStore) { return this.state.repliesStore; }
    return new RepliesStore(repliesStore.models, {
      router: router,
      accessTokenStore: accessTokenStore,
      forumStore: forumStore,
      topicsStore: topicsStore,
      currentUserStore: currentUserStore
    });
  },

  //EVENT HANDLES ---------------------------
  onRouteUpdate(){
    this.setState(this.getStateForRoute());
  }

});
