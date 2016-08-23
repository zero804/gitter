import React, {PropTypes, createClass} from 'react';
import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';

export default createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,

    topicsStore: PropTypes.shape({
      models: PropTypes.array.isRequired,
      getById: PropTypes.func.isRequired,
    }).isRequired,
  },

  render(){

    const { topicId, topicsStore } = this.props;
    const topic = topicsStore.getById(topicId)

    return (
      <main>
        <TopicHeader topic={topic}/>
        <TopicBody topic={topic} />
      </main>
    );
  }
});
