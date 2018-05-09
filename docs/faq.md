# FAQ

Frequently asked questions.

## How much does it cost?

Gitter is entirely free for all public and private conversations.


## Can I merge/connect my accounts?

See [Accounts](./accounts.md#can-i-mergeconnect-my-accounts)


## Can I change my username?

See [Accounts](./accounts.md#can-i-change-my-username)


### How do I remove the  `_twitter` suffix from my username

See [Accounts](./accounts.md#how-do-i-remove-the-twitter-suffix-from-my-username)


## How do I update my avatar?

See [Accounts](./accounts.md#how-do-i-update-my-avatar)


## Why isn't my GitHub organisation or repos appearing?

The first thing to check is [adding private repo access OAuth scope](./oauth-scopes.md#private-repositories) in order to see a private GitHub repo.

If it isn't a private repo, the key is to make sure your personal GitHub OAuth scopes and GitHub organisation scopes match.

You can check these settings here,

 - [Personal OAuth application settings](https://github.com/settings/applications)
 - Organisation OAuth application settings, `https://github.com/organizations/YOURORG/settings/applications`

For example, if you have ["Gitter Private Repo Access"](./oauth-scopes#private-repositories)
granted personally or on the organisation, please make sure it is also granted on the other.

You can also try making your organisation membership public, `https://github.com/orgs/YOURORG/people`

For more information see [OAuth Scopes](./oauth-scopes).


## You want write access on my private repos? Are you insane?

See ["Private Repositories" on the OAuth scopes page](./oauth-scopes.md#private-repositories)

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
