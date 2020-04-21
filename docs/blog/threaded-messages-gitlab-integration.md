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
- [Threaded conversation notifications - Unfollow thread](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2483]
- [Thread summary overview](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2431)

The full list of outstanding work can be found in our [GitLab issue tracker](https://gitlab.com/gitlab-org/gitter/webapp/-/issues?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=threaded-conversations).

We are still planning on implementing these features but we decided to release threaded conversations for everyone to provide you with as much value as possible.

### How to give us feedback

We are grateful for both positive and constructive feedback. If you are happy with the new features and you'd like to tell us, the best channels are the [gitterHQ/gitter](https://gitter.im/gitterHQ/gitter) room and our Twitter account [@gitchat](https://twitter.com/gitchat).

For constructive feedback we love to use GitLab issues where we track all outstanding work. Please first check your suggestion is not already tracked in [open threaded conversations issues](https://gitlab.com/gitlab-org/gitter/webapp/-/issues?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=threaded-conversations). Than you can create a new issue in the same view.

We have been [iteratively improving](https://about.gitlab.com/handbook/values/#iteration) threaded conversations behind a room feature toggle you could turn on. If you want to give us feedback earlier on in the development cycle, we announce smaller dev updates like this on the [@gitchat Twitter](https://twitter.com/gitchat), so you can stay up to date there.

We hope you'll enjoy better message structure in your rooms with the threaded conversations.
