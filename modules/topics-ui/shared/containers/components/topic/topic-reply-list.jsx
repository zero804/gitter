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
            {this.props.children.map(this.mapChild)}
          </ul>
        </Panel>
      </Container>
    );
  },

  mapChild(child, index) {
    return (
      <li key={`reply-list-item-${index}`}>
        {child}
      </li>
    );
  }

});
