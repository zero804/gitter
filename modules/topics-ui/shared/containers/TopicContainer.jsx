import React, {PropTypes, createClass} from 'react';
import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeader from './components/search/search-header.jsx';
import TopicReplyEditor from './components/topic/topic-reply-editor.jsx';

export default createClass({

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
  },

  render(){

    const { topicId, topicsStore, groupName, repliesStore, categoryStore } = this.props;
    const topic = topicsStore.getById(topicId)
    const replies = repliesStore.getReplies();
    //TODO Improve this
    const category = categoryStore.getCategories()[1];

    return (
      <main>
        <SearchHeader groupName={groupName}/>
        <TopicHeader topic={topic} category={category}/>
        <TopicBody topic={topic} />
        <TopicReplyEditor />
      </main>
    );
  }
});
