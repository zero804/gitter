# FAQ

Frequently asked questions.

## How much does it cost?

Gitter is entirely free for all public and private conversations.


## Can I merge/connect my accounts?

There isn't a way to merge accounts.


## Can I change my username?

You can't change your username. Your username matches whatever OAuth provider you signed in with.

If you changed your username on GitHub, sign out of Gitter and sign back in again to update it.


### How do I remove the  `_twitter` suffix from my username

See above, you can't change your username.

We add the `_twitter` suffix to avoid name collisions with GitHub.
If you don't want the suffix added, sign in with GitHub.


## How do I update my avatar?

Sign out of Gitter and sign back in to update your avatar (or any other info).


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

See ["Private Repositories" on the OAuth scopes page](./oauth-scopes#private-repositories)
