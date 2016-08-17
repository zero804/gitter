import React from 'react';
import Backbone from 'backbone';
import ForumContainer from 'gitter-web-topics-ui/containers/ForumContainer.jsx';
import CategoryStore from './stores/forum-category-store';
import navConstatnts from 'gitter-web-topics-ui/shared/constants/navigation';

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
    return { route: router.get('route') };
  },

  getForumState(){
    const categoryStore = (window.context.categoryStore || {});
    const { router } = this.props;
    return Object.assign(this.getDefaultState(), {
      groupName: router.get('groupName'),
      categoryStore: new CategoryStore(categoryStore.models, { router: router }),
    });
  }

});
