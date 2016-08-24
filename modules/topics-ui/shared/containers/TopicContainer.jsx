import React, {PropTypes, createClass} from 'react';
import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeader from './components/search/search-header.jsx';

export default createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,

    topicsStore: PropTypes.shape({
      models: PropTypes.array.isRequired,
      getById: PropTypes.func.isRequired,
    }).isRequired,
  },

  render(){

    const { topicId, topicsStore, groupName } = this.props;
    const topic = topicsStore.getById(topicId)

    return (
      <main>
        <SearchHeader groupName={groupName}/>
        <TopicHeader topic={topic}/>
        <TopicBody topic={topic} />
      </main>
    );
  }
});
