import React, { PropTypes } from 'react';
import classNames from 'classnames';

import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';


export default React.createClass({

  displayName: 'SubscribeButton',

  propTypes: {
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    children:  React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    onClick: PropTypes.func,
    className: PropTypes.string,
    itemClassName: PropTypes.string,
    subscribedText: PropTypes.string,
    unsubscribedText: PropTypes.string,
    pendingText: PropTypes.string
  },

  getDefaultProps() {
    return {
      subscribedText: 'Unsubsrcibe',
      unsubscribedText: 'Subscribe',
      pendingText: 'Pending'
    };
  },

  render() {
    const {children, className, itemClassName, subscriptionState} = this.props;

    let {subscribedText, unsubscribedText, pendingText} = this.props;

    var compiledClassNames = className + ' ' + classNames({
      pending: subscriptionState === SUBSCRIPTION_STATE_PENDING
    })

    var subscribedCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED
    });

    var unsubscribedCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: subscriptionState !== SUBSCRIPTION_STATE_UNSUBSCRIBED
    });

    var pendingCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: subscriptionState !== SUBSCRIPTION_STATE_PENDING
    });

    var watchNodes = [
      <span
        key="subscribed"
        className={subscribedCompiledClassNames}>
        {subscribedText}
      </span>,
      <span
        key="unsubscribed"
        className={unsubscribedCompiledClassNames}>
        {unsubscribedText}
      </span>,
      <span
        key="pending"
        className={pendingCompiledClassNames}>
        {pendingText}
      </span>
    ];

    return (
      <button
        className={compiledClassNames}
        onClick={this.onClick}>
        {children || watchNodes}
      </button>
    );
  },


  onClick(e){
    e.preventDefault();
    const {onClick} = this.props;
    if(onClick) { return onClick(...arguments); }
  }

});
