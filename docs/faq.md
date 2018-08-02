# FAQ

Frequently asked questions.

## How much does it cost?

Gitter is entirely free for all public and private conversations.

## I have a suggestion, where can I suggest/discuss it?

Feel free to come discuss your idea in the [`gitterHQ/gitter`](https://gitter.im/gitterHQ/gitter) room and create an issue, https://gitlab.com/gitlab-org/gitter/webapp/issues


## Help/Support!?!?!

If your support inquiry doesn't need to be private, drop by the [`gitterHQ/gitter`](https://gitter.im/gitterHQ/gitter) room.

Otheriwse, send a message to support@gitter.im


## Do you have an API?

Why, we are so gladded you asked, **yes** we do.

You can build apps on top of Gitter by using our REST API. You can find more information about it at [developer.gitter.im](https://developer.gitter.im/) or use our [Node.js module](https://www.npmjs.org/package/node-gitter).

If you have any questions about our API, please don't hesitate to contact us or join us in our [`gitterHQ/api`](https://gitter.im/gitterHQ/api) chat room.


## Can I merge/connect my accounts?

See [Accounts](./accounts.md#can-i-mergeconnect-my-accounts)


## Can I change my username?

See [Accounts](./accounts.md#can-i-change-my-username)


### How do I remove the  `_twitter` suffix from my username

See [Accounts](./accounts.md#how-do-i-remove-the-twitter-suffix-from-my-username)


## How do I update my avatar?

See [Accounts](./accounts.md#how-do-i-update-my-avatar)


## You want write access on my private repos? Are you insane?

See ["Private Repositories" on the OAuth scopes page](./oauth-scopes.md#private-repositories)


## Why isn't my GitHub organisation or repos appearing?

The first thing to check is [adding private repo access OAuth scope](./oauth-scopes.md#private-repositories) in order to see a private GitHub repo.

If it isn't a private repo, the key is to make sure your personal GitHub OAuth scopes and GitHub organisation scopes match.

You can check these settings here,

 - [Personal OAuth application settings](https://github.com/settings/applications)
 - Organisation OAuth application settings, `https://github.com/organizations/YOURORG/settings/applications`

For example, if you have ["Gitter Private Repo Access"](./oauth-scopes.md#private-repositories)
granted personally or on the organisation, please make sure it is also granted on the other.

You can also try making your organisation membership public, `https://github.com/orgs/YOURORG/people`

For more information see [OAuth Scopes](./oauth-scopes.md).


## What happens if I rename something on GitHub (org, repo)

#### Org rename

Org renames do not happen automatically and require a script to be run manually on our side.

Send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Make sure your org membership is public on both the old and new org, `https://github.com/orgs/your-org/people`
 - Link to the old org on GitHub
 - Link to the new org on GitHub
 - Link to the community on Gitter, `https://gitter.im/orgs/your-community/rooms`

#### Repo rename

Repo renames do not happen automatically. Create a new room tied to the repo and we can move the messages over manually. Please note, this will not move room members over.

Send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Create a new room tied to the repo
 - Link to where the repo used to exist on GitHub
 - Link to where the repo now exists on GitHub
 - Link to the old room on Gitter
 - Link to the new room on Gitter

#### Transfer repo to a new org

Repo transfers do not happen automatically. Create a new room tied to the repo and we can move the messages over manually. Please note, this will not move room members over.

Send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Create a new room tied to the repo
 - Make sure your org membership is public on both the old and new org, `https://github.com/orgs/your-org/people`
 - Link to where the repo used to exist on GitHub
 - Link to where the repo now exists on GitHub
 - Link to the old room on Gitter
 - Link to the new room on Gitter


## What is Gitter Next?

Gitter Next is where we put our up-coming release branch up for preview. Most of the time it's small changes or even under-the-hood changes you don't see. Sometimes we put pretty large changes up there too and love to hear your feedback.
Sometimes it blows up, but not very often.

You can enable Gitter next in a variety of ways.

#### Desktop Browser

In your desktop browser, visit http://next.gitter.im and move the giant switchy thing over to next. Then refresh. You will notice a little green pill at the top of your screen that says "NEXT". You are now on Next.

There's also a bookmarklet at the bottom of the Next page and you can add this to your browser things to toggle this pretty easily.

#### Linux and Windows app

There's a convenient little toggle on the Gitter menu of your application to turn Next on or off.

![](https://i.imgur.com/QZJm2MM.png)

#### Mac app

**Gitter** menu bar dropdown in the top-left -> **Use Gitter Next**

![](https://i.imgur.com/YXtPn4N.png)
