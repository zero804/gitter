import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    children: PropTypes.node.isRequired,
  },

  render(){
    return (
      <Container>
        <Panel className="panel--topic-reply-list">
          <ul className="topic-reply-list">
            {this.props.children}
          </ul>
        </Panel>
      </Container>
    );
  }

});
