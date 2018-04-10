# OAuth Scopes

## GitHub

We have two levels of authentication with GitHub, one for participation and creation of chat rooms for public repositories, and one for private repositories.

#### Public Repositories

When granting Gitter access to GitHub, we request the following capabilities

 - Read Email: This is to notify you of new messages and rooms by email. You can easily unsubscribe to these notifications either from the emails or in Notification Settings.
 - Organisation & Team: This allows you to create rooms from any of your public repositories in organisations you are part of; all it really enables is for us to list the organisations you are part of. We also list your fellow organisation members when creating these rooms so you can easily add or invite them to the room, but we are unable to read any personal information for them other than what is public on GitHub.

Other than a short-lived in-memory cache for performance reasons, none of your GitHub data is stored.


#### Private Repositories

If you want to create chat rooms for private repositories, and inherit all of the permissions from GitHub, you need to grant us repo scope. Unfortunately, GitHub only has one option for this, and this scope grants full access to your private repositories. Other than listing commits and issues, we don't touch the actual code of your repositories in any way.

The only time we ever "write" to a private repo is to add a webhook integration. We will never, ever modify your code. Ever. Just like you, we're developers and entirely respect the privacy of your code.

If you are uncomfortable with this permission, you can always create a private channel and manually add people and GitHub webhooks into that room. This will lose the automatic permissions, which means people with access to the repository, won't be able to automatically join the room and you will have to add them.

Alternatively, you can create private channels that are not based on GitHub resources, this way you can create private rooms that don't map to a private repo.

---

If you don't see "Gitter Private Repo Access" listed in your [personal application settings](https://github.com/settings/applications), you can start the process in Gitter via the user dropdown menu in the top-right.

![](https://i.imgur.com/hn4dRO1.png)

You can also use this link which will redirect you to add the private repo permission: https://gitter.im/login/upgrade?scopes=repo


#### Organisation Access Control

GitHub recently introduced [organization-approved applications](https://blog.github.com/2015-01-19-organization-approved-applications/) which significantly changes how organisations interact with the API. This new feature means that organisations can block OAuth Applications and access needs to be requested/enabled. If you don't want Gitter to have access to a particular organisation for whatever reason, please ensure this is turned on or revoke Gitter's access to this organisation. You need to have admin access to the org in order to do this.

---

We normally request organisation access during sign-up so existing users creating/joining new organisations will run into a few snags.

There are one of two things you can do:

**Disable the setting**. If you visit https://github.com/organizations/YOURORG/settings/oauth_application_policy you can disable the restriction from this page.

**Manually grant access**

Visit your [personal application settings](https://github.com/settings/applications) and find any Gitter applications there, click on the name of application and you should see the list of organisations that allow access to the application and you can grant access here.

Please note that if you enable Gitter for access to private repositories, you will need to do this for the "Gitter Private Repo Access" application as well. If you don't see "Gitter Private Repo Access" listed in your personal application settings, see the ["Private Repositories"](#private-repositories) section above.

![](https://i.imgur.com/9GtNmUP.png)

![](https://i.imgur.com/HpCotUq.png) ![](https://i.imgur.com/Ljlb4nf.png)


## GitLab

> [Introduced](https://gitlab.com/gitlab-org/gitter/webapp/merge_requests/1076) in Gitter 19.0.0

You can sign in via GitLab. Your username will have a `_gitlab` suffix.


## Twitter

You can sign in via Twitter. Your username will have a `_twitter` suffix.

Please be aware you can only use Twitter to access public rooms and some rooms may have blocked access to Twitter accounts (see ["Restrict room to GitHub users"](./rooms.md#restrict-room-to-github-users)).
