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

  getInitialState(){
    const { topicsStore, topicId } = this.props;
    return {
      topic: topicsStore.getById(topicId)
    }
  },

  render(){

    const { topic } = this.state;

    return (
      <main>
        <TopicHeader topic={topic}/>
        <TopicBody topic={topic} />
      </main>
    );
  }
});
