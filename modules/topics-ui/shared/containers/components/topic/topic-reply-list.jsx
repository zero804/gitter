import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    children: PropTypes.node.isRequired,
    replyListEditorInFocus: PropTypes.bool,
  },

  render(){

    const {replyListEditorInFocus} = this.props;
    const compiledClass = classNames({
      'topic-reply-list--editor-active': replyListEditorInFocus
    }, 'topic-reply-list')

    return (
      <Container>
        <Panel className="panel--topic-reply-list">
          <ul className={compiledClass}>
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
