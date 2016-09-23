import React, {PropTypes, createClass} from 'react';
import {dispatch} from '../dispatcher';
import frameUtils from 'gitter-web-frame-utils';
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
    const {repliesStore, newReplyStore} = this.props;
    repliesStore.onChange(this.updateReplies, this);
    newReplyStore.on('change:text', this.updateReplyContent, this);
  },

  componentWillUnmount(){
    const {repliesStore, newReplyStore} = this.props;
    repliesStore.removeListeners(this.updateReplies, this);
    newReplyStore.off('change:text', this.updateReplyContent, this);
  },

  getInitialState(){
    const {repliesStore} = this.props;
    return {
      replies: repliesStore.getReplies(),
      newReplyContent: '',
    };
  },


  render(){
    const { topicId, topicsStore, groupName, categoryStore, currentUserStore, tagStore } = this.props;
    const {replies, newReplyContent} = this.state;
    const topic = topicsStore.getById(topicId)
    const currentUser = currentUserStore.getCurrentUser();
    var isSignedIn = !!currentUser.id;
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
          groupName={groupName}
          isSignedIn={isSignedIn}/>
        <article>
          <TopicHeader
            topic={topic}
            category={category}
            groupName={groupName}
            tags={tags}/>
          <TopicBody topic={topic} />
        </article>
        <TopicReplyListHeader replies={replies}/>
        <TopicReplyList replies={replies} />
        <TopicReplyEditor
          user={currentUser}
          value={newReplyContent}
          onChange={this.onEditorUpdate}
          onSubmit={this.onEditorSubmit}
          onEditorClick={this.onEditorClick}/>
      </main>
    );
  },

  onEditorUpdate(val){
    dispatch(updateReplyBody(val));
  },

  onEditorSubmit(){
    const {currentUserStore, newReplyStore} = this.props;
    const currentUser = currentUserStore.getCurrentUser();
    var isSignedIn = !!currentUser.id;


    if(isSignedIn) {
      dispatch(submitNewReply(newReplyStore.get('text')));
      //Clear input
      newReplyStore.clear();
      this.setState((state) => Object.assign(state, {
        newReplyContent: '',
      }));
    }
    else {
      frameUtils.postMessage({ type: 'route-silent', hash: 'login' });
    }
  },

  onEditorClick() {
    const { currentUserStore } = this.props;
    const currentUser = currentUserStore.getCurrentUser();
    var isSignedIn = !!currentUser.id;

    if(!isSignedIn) {
      frameUtils.postMessage({ type: 'route-silent', hash: 'login' });
    }
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
