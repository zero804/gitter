"use strict";

import React, {PropTypes, createClass} from 'react';
import TopicHeader from '../shared/components/topic/topic-header.jsx';
import TopicBody from '../shared/components/topic/topic-body.jsx';

module.exports = createClass({

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
