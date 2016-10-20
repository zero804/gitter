import { SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../../../shared/constants/forum';
import { MODEL_STATE_SYNCED } from '../../../shared/constants/model-states';

export default [
  {
    title: '1',
    state: MODEL_STATE_SYNCED,
    id: '1',
    slug: '1',
    name: '1',
    body: { html: 'test'},
    category: { name: 'Test 1', slug: 'test-1'},
    tags: [ '1', '2', '3' ],
    user: { username: 'cutandpastey', avatarUrl: 'test-src'},
    replyingUsers: [],
    subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED,
    reactions: { likes: 1 }
  },
  {
    title: '2',
    state: MODEL_STATE_SYNCED,
    id: '2',
    slug: '2',
    name: '2',
    body: { html: 'test'},
    category: { name: 'Test 2', slug: 'test-2'},
    tags: [ '2', '3', '4' ],
    user: { username: 'test', avatarUrl: 'test-src'},
    replyingUsers: [],
    subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED,
    reactions: { likes: 1 }
  },
  {
    title: '3',
    state: MODEL_STATE_SYNCED,
    id: '3',
    slug: '3',
    name: '3',
    body: { html: 'test'},
    category: { name: 'Test 3', slug: 'test-3'},
    tags: [ '3', '4', '5' ],
    user: { username: 'cutandpastey', avatarUrl: 'test-src'},
    replyingUsers: [],
    subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED,
    reactions: { likes: 1 }
  },
  {
    title: '4',
    state: MODEL_STATE_SYNCED,
    id: '4', slug: '4',
    name: '4',
    body: { html: 'test'},
    category: { name: 'Test 4', slug: 'test-4'},
    tags: [ '4', '5', '6' ],
    user: { username: 'test', avatarUrl: 'test-src'},
    replyingUsers: [],
    subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED,
    reactions: { likes: 1 }
  },
  {
    title: '5',
    state: MODEL_STATE_SYNCED,
    id: '5',
    slug: '5',
    name: '5',
    body: { html: 'test'},
    category: { name: 'Test 5', slug: 'test-5'},
    tags: [ '5', '6', '7' ],
    user: { username: 'test-user', avatarUrl: 'test-src'},
    replyingUsers: [],
    subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED,
    reactions: { likes: 1 }
  },
];
