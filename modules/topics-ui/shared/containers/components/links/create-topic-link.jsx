import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'CreateTopicLink',
  propTypes: {
    children: PropTypes.node.isRequired,
    groupName: PropTypes.string.isRequired,
  },

  render(){

    const {groupName} = this.props;
    const href = `/${groupName}/topics/create-topic`;

    return (
      <a title="Create a new topic" href={href}>{this.props.children}</a>
    );
  }

});
