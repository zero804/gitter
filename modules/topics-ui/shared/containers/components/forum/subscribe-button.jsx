import _ from 'underscore';
import React, { PropTypes } from 'react';
import classNames from 'classnames';

import { SUBSCRIPTION_STATE } from '../../../constants/forum.js';


export default React.createClass({

  displayName: 'SubscribeButton',

  propTypes: {
    subscriptionState: PropTypes.oneOf(_.values(SUBSCRIPTION_STATE)).isRequired,
    children: PropTypes.node,
    onClick: PropTypes.func,
    className: PropTypes.string,
    itemClassName: PropTypes.string,
    subscribedText: PropTypes.string,
    unsubscribedText: PropTypes.string,
    pendingText: PropTypes.string
  },

  render() {
    const {children, className, itemClassName, subscriptionState} = this.props;

    let {subscribedText, unsubscribedText, pendingText} = this.props;
    subscribedText = subscribedText || 'Unsubsrcibe';
    unsubscribedText = unsubscribedText || 'Subscribe';
    pendingText = pendingText || 'Pending';

    var compiledClassNames = className + ' ' + classNames({
      pending: subscriptionState === SUBSCRIPTION_STATE.PENDING
    })

    var subscribedCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: subscriptionState !== SUBSCRIPTION_STATE.SUBSCRIBED
    });

    var unsubscribedCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: subscriptionState !== SUBSCRIPTION_STATE.UNSUBSCRIBED
    });

    var pendingCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: subscriptionState !== SUBSCRIPTION_STATE.PENDING
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
