import React, {PropTypes, createClass} from 'react';
import {dispatch} from '../dispatcher';
import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeader from './components/search/search-header.jsx';
import TopicReplyEditor from './components/topic/topic-reply-editor.jsx';
import TopicReplyListHeader from './components/topic/topic-reply-list-header.jsx';
import TopicReplyList from './components/topic/topic-reply-list.jsx';
import updateReplyBody from '../action-creators/create-reply/body-update';
import submitNewReply from '../action-creators/create-reply/submit-new-reply';

const TopicContainer = createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,

    //Forum
    forumStore: React.PropTypes.shape({
      getForumId: React.PropTypes.func.isRequired,
      getSubscriptionState: React.PropTypes.func.isRequired
    }).isRequired,

    topicsStore: PropTypes.shape({
      getById: PropTypes.func.isRequired,
    }).isRequired,

    repliesStore: PropTypes.shape({
      getReplies: PropTypes.func.isRequired
    }).isRequired,

    categoryStore: PropTypes.shape({
      getCategories: PropTypes.func.isRequired,
    }).isRequired,

    tagStore: PropTypes.shape({
      getTags: PropTypes.func.isRequired,
      getTagsByLabel: PropTypes.func.isRequired,
    }).isRequired,

    currentUserStore: PropTypes.shape({
      getCurrentUser: PropTypes.func.isRequired
    }).isRequired,

    newReplyStore: PropTypes.shape({
      get: PropTypes.func.isRequired,
    })

  },

  componentDidMount(){
    const {forumStore, topicsStore, repliesStore, newReplyStore} = this.props;
    forumStore.onChange(this.onForumUpdate, this);
    topicsStore.onChange(this.onTopicsUpdate, this);
    repliesStore.onChange(this.updateReplies, this);
    newReplyStore.on('change:text', this.updateReplyContent, this);
  },

  componentWillUnmount(){
    const {forumStore, topicsStore, repliesStore, newReplyStore} = this.props;
    forumStore.removeListeners(this.onForumUpdate, this);
    topicsStore.removeListeners(this.onTopicsUpdate, this);
    repliesStore.removeListeners(this.updateReplies, this);
    newReplyStore.off('change:text', this.updateReplyContent, this);
  },

  getInitialState(){
    const {forumStore, topicsStore, repliesStore, topicId} = this.props;
    return {
      forumId: forumStore.getForumId(),
      forumSubscriptionState: forumStore.getSubscriptionState(),
      topic: topicsStore.getById(topicId),
      replies: repliesStore.getReplies(),
      newReplyContent: '',
    };
  },


  render(){

    const { groupName, categoryStore, currentUserStore, tagStore } = this.props;
    const {topic, forumId, forumSubscriptionState, replies, newReplyContent} = this.state;
    const currentUser = currentUserStore.getCurrentUser();
    const userId = currentUser.id;
    const topicCategory = topic.category;
    const category = categoryStore.getById(topicCategory.id);

    //TODO remove
    //This is here because sometimes you can get un-parsed tags
    //we need to hydrate the client stores with the raw SS data
    //not the parsed data which will avoid nesting and inconsistent data
    const tagValues = topic.tags.map(function(t){
      return t.label ? t.label : t;
    });
    const tags = tagStore.getTagsByLabel(tagValues);

    return (
      <main>
        <SearchHeader
          userId={userId}
          forumId={forumId}
          groupName={groupName}
          subscriptionState={forumSubscriptionState}/>
        <article>
          <TopicHeader
            topic={topic}
            category={category}
            groupName={groupName}
            tags={tags}/>
          <TopicBody
            userId={userId}
            forumId={forumId}
            topic={topic} />
        </article>
        <TopicReplyListHeader replies={replies}/>
        <TopicReplyList
          userId={userId}
          forumId={forumId}
          topicId={topic.id}
          replies={replies} />
        <TopicReplyEditor
          user={currentUser}
          value={newReplyContent}
          onChange={this.onEditorUpdate}
          onSubmit={this.onEditorSubmit}/>
      </main>
    );
  },

  onEditorUpdate(val){
    dispatch(updateReplyBody(val));
  },

  onEditorSubmit(){
    const {newReplyStore} = this.props;
    dispatch(submitNewReply(newReplyStore.get('text')));
    //Clear input
    newReplyStore.clear();
    this.setState((state) => Object.assign(state, {
      newReplyContent: '',
    }));
  },

  onForumUpdate() {
    const { forumStore } = this.props;
    this.setState((state) => Object.assign(state, {
      forumId: forumStore.getForumId(),
      forumSubscriptionState: forumStore.getSubscriptionState()
    }));
  },

  onTopicsUpdate() {
    const { topicsStore, topicId } = this.props;
    this.setState((state) => Object.assign(state, {
      topic: topicsStore.getById(topicId)
    }));
  },

  updateReplyContent(){
    const {newReplyStore} = this.props;
    const newReplyContent = newReplyStore.get('text');
    this.setState((state) => Object.assign(state, {
      newReplyContent: newReplyContent,
    }));
  },

  updateReplies(){
    const {repliesStore} = this.props;
    this.setState((state) => Object.assign(state, {
      replies: repliesStore.getReplies(),
      newReplyContent: '',
    }));
  }

});

export default TopicContainer;
