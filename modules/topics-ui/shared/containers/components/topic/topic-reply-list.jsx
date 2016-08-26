import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    replies: PropTypes.array.isRequired,
  },

  render(){
    return (
      <Container>
        <Panel className="panel--topic-reply-list">
          <ul></ul>
        </Panel>
      </Container>
    );
  }

});
