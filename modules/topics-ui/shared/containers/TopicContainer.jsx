import React, {PropTypes, createClass} from 'react';
import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeader from './components/search/search-header.jsx';
import TopicReplyEditor from './components/topic/topic-reply-editor.jsx';
import TopicReplyListHeader from './components/topic/topic-reply-list-header.jsx';
import TopicReplyList from './components/topic/topic-reply-list.jsx';
import {dispatch} from '../dispatcher';
import updateReplyBody from '../action-creators/create-reply/body-update';
import submitNewReply from '../action-creators/create-reply/submit-new-reply';
import {REPLY_CREATED} from '../constants/create-reply';

const TopicContainer = createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,

    topicsStore: PropTypes.shape({
      models: PropTypes.array.isRequired,
      getById: PropTypes.func.isRequired,
    }).isRequired,

    repliesStore: PropTypes.shape({
      getReplies: PropTypes.func.isRequired
    }).isRequired,

    categoryStore: PropTypes.shape({
      getCategories: PropTypes.func.isRequired,
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
    repliesStore.removeListeners();
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

    const { topicId, topicsStore, groupName, categoryStore, currentUserStore } = this.props;
    const {replies, newReplyContent} = this.state;
    const topic = topicsStore.getById(topicId)
    const currentUser = currentUserStore.getCurrentUser();
    //TODO Improve this
    const category = categoryStore.getCategories()[1];

    return (
      <main>
        <SearchHeader groupName={groupName}/>
        <article>
          <TopicHeader topic={topic} category={category} groupName={groupName}/>
          <TopicBody topic={topic} />
        </article>
        <TopicReplyListHeader replies={replies}/>
        <TopicReplyList replies={replies} />
        <TopicReplyEditor
          user={currentUser}
          value={newReplyContent}
          onChange={this.onEditorUpdate}
          onEnter={this.onEditorSubmit}/>
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
