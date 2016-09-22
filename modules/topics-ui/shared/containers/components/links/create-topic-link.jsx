import React, { PropTypes } from 'react';
import navigateToCreateTopic from '../../../action-creators/create-topic/navigate-to-create-topic';
import {dispatch} from '../../../dispatcher';

export default React.createClass({

  displayName: 'CreateTopicLink',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    className: PropTypes.string,
  },

  render(){

    const {groupName, className} = this.props;
    const href = `/${groupName}/topics/create-topic`;

    return (
      <a
        title="Create a new topic"
        href={href}
        className={className}
        onClick={this.onClick}>
        {this.props.children}
      </a>
    );
  },

  onClick(e){
    e.preventDefault();
    const {onClick} = this.props;
    if(onClick) { return onClick(...arguments); }
    dispatch(navigateToCreateTopic());
  }

});
