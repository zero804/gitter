import React, { PropTypes } from 'react';
import navigateToCreateTopic from '../../../action-creators/create-topic/navigate-to-create-topic';
import {dispatch} from '../../../dispatcher';

export default React.createClass({

  displayName: 'CreateTopicLink',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    className: PropTypes.string
  },

  render(){

    const {groupUri, className} = this.props;

    const createTopicHref = `/${groupUri}/topics/create-topic`;

    return (
      <a
        title="Create a new topic"
        href={createTopicHref}
        className={className}
        onClick={this.onClick}>
        {this.props.children}
      </a>
    );
  },

  onClick(e){
    const {onClick} = this.props;
    if(onClick) { return onClick(...arguments); }
    dispatch(navigateToCreateTopic());
    e.preventDefault();
  }

});
