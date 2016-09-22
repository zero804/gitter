import React, { PropTypes } from 'react';
import navigateToCreateTopic from '../../../action-creators/create-topic/navigate-to-create-topic';
import {dispatch} from '../../../dispatcher';

export default React.createClass({

  displayName: 'CreateTopicLink',
  propTypes: {
    children: PropTypes.node.isRequired,
    groupName: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    className: PropTypes.string,
    href: PropTypes.string,
    disableNavigation: PropTypes.bool
  },

  render(){

    const {groupName, className, href} = this.props;

    const createTopicHref = href || `/${groupName}/topics/create-topic`;

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
    const {onClick, disableNavigation} = this.props;
    if(onClick) { return onClick(...arguments); }
    if(!disableNavigation) {
      dispatch(navigateToCreateTopic());
      e.preventDefault();
    }
  }

});
