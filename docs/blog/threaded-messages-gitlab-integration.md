# Threaded conversations and GitLab based communities and rooms

After months of development we are proud to introduce two new major features: Threaded conversations and GitLab based communities and rooms.

## Threaded conversations

Multiple conversations in a busy Gitter room can become hard to follow. Up until now the main way of keeping message context has been using [Permalinks](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/messages.md#permalinks) and [quoting in Markdown syntax](https://daringfireball.net/projects/markdown/syntax#blockquote).

Improving the way Gitter conversations can be organized became one of our first priorities last year. After careful consideration of our options (e.g. [forum style](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/741#note_171220229) conversations) we [chose to implement threaded conversations](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2143) following similar pattern as chat platforms like Slack and Twitter.

### How to write threaded messages

1. You can start a thread for every message in the room by choosing **Start a thread** option in the `...` dropdown in the top-right corner of every message.
2. If the message already has a thread attached to it, the easiest way to open the thread is to click on the thread message indicator below the message.
3. The rest of the conversation happens in what we call the Thread message feed where you can view and reply to the thread.

![Threaded messages screenshot](https://i.imgur.com/7MRkEAT.png)

### Support for threaded conversations in mobile apps

Threads are minimally supported in the mobile apps and the [mobile apps overall may be deprecated](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2281) in the future. Main reason for this minimal support is the Gitter team's workload and the resulting conscious prioritization of the web experience.

Every thread message appears in the main message feed and it is marked as being part of a thread. When you click on the indicator, you are taken into web browser that will show you the whole thread. *The mobile apps don't provide a way to write threaded messages.*

![iOS support for threaded conversations](https://gitlab.com/gitlab-org/gitter/webapp/uploads/fa8e50053ac25a386d441da7cdbe4c03/Kapture_2020-02-03_at_14.54.46.gif)

### What's not implemented yet

Keeping a [low-level of shame](https://about.gitlab.com/handbook/values/#low-level-of-shame), we are releasing threaded conversations in a usable state with lots of value but there are still some use cases we want to address.

The main missing features are:

- [Typeahead in the message input](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2344) - usernames, emojis, issues
- [Decorating messages](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2340) - user profile popover, issue states
- [Replying workflows](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2341) - clicking @username populating the message input with the handle
- [Composing multiline messages](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2338)
- [Threaded conversation notifications - Unfollow thread](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2483)
- [Thread summary overview](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2431)

The full list of outstanding work can be found in our [GitLab issue tracker](https://gitlab.com/gitlab-org/gitter/webapp/-/issues?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=threaded-conversations).

We are still planning on implementing these features but we decided to release threaded conversations for everyone to provide you with as much value as possible.

## GitLab based communities and rooms

[Gitter was acquired by GitLab](https://about.gitlab.com/blog/2017/03/15/gitter-acquisition/) back in 2017.
We've been slowly adding more integration between them like open sourcing the [codebase on GitLab](https://gitlab.com/gitlab-org/gitter/webapp), adding the ability to sign in with your GitLab account, and [issue decorations](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/messages.md#issuable-decorations).

At last, we have **GitLab based communities and rooms**. This means that you can create a Gitter community/room and the permissions can inherit from your GitLab [group](https://docs.gitlab.com/ee/user/group/) or [project](https://docs.gitlab.com/ee/user/project/). Just sign in with your GitLab account and head over to the [create community](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/communities.md#community-creation) and [create room](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/rooms.md#room-creation) flows.

 - :white_check_mark: Gitter communities based on [GitLab groups](https://docs.gitlab.com/ee/user/group/)
 - :white_check_mark: Gitter communities based on [GitLab projects](https://docs.gitlab.com/ee/user/project/)
 - :x: Gitter communities based on your personal GitLab user namespace are not supported yet but we plan to follow up soon after -> https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2397
 - :white_check_mark: Gitter rooms based on [GitLab projects](https://docs.gitlab.com/ee/user/project/)


### What's not implemented yet

Gitter communities/rooms based on GitLab projects from your own personal user namespace are not supported yet but we plan to follow up soon after. You can track the [specific issue](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2397) and our [*Create GitLab based communities and rooms* epic](https://gitlab.com/groups/gitlab-org/-/epics/398).



### Updated create community and create room UI (now using Vue.js)

Alongside these additions, the community and room creation flows have also been updated.
Both simplified to reduce the complexity and now have more clear and actionable errors to help when you run into a sticky point. They're also coded with [Vue.js](https://vuejs.org/) now as part of our migration from [Backone/Marionette](https://marionettejs.com/).

The room creation modal updates give you a lot more freedom around associating a project/repo.
Now you can associate a project/repo with any room regardless of the room name or which community it is part of.
Previously the room name had to match the repo name and be inside a community associated with the GitHub org.

![](https://i.imgur.com/b8Kty6d.png) ![](https://i.imgur.com/yOobB1g.png)

## How to give us feedback

We are grateful for both positive and constructive feedback. If you are happy with the new features and you'd like to tell us, the best channels are the [gitterHQ/gitter](https://gitter.im/gitterHQ/gitter) room and our Twitter account [@gitchat](https://twitter.com/gitchat).

For constructive feedback we love to use GitLab issues where we track all outstanding work. Please first check your suggestion is not already tracked in

- [Open threaded conversations issues](https://gitlab.com/gitlab-org/gitter/webapp/-/issues?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=threaded-conversations)
- *Create GitLab based communities and rooms epic](https://gitlab.com/groups/gitlab-org/-/epics/398

If the issue hasn't been tracked yet, you can [create a new issue](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D=).

We have been [iteratively improving](https://about.gitlab.com/handbook/values/#iteration) threaded conversations behind a room feature toggle you could turn on. If you want to give us feedback earlier on in the development cycle, we announce smaller dev updates like this on the [@gitchat Twitter](https://twitter.com/gitchat), so you can stay up to date there.

We hope you'll enjoy both having better message structure in your rooms with the threaded conversations and being able integrate your rooms and communities with GitLab.
