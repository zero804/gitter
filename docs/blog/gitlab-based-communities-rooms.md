## GitLab based communities and rooms

[Gitter was acquired by GitLab](https://about.gitlab.com/blog/2017/03/15/gitter-acquisition/) back in 2017.
We've been slowly adding more integration between them like open sourcing the [codebase on GitLab](https://gitlab.com/gitlab-org/gitter/webapp), adding the ability to sign in with your GitLab account, and [issue decorations](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/messages.md#issuable-decorations).

At last, we have **GitLab based communities and rooms**. This means that you can create a Gitter community/room and the permissions can inherit from your GitLab [group](https://docs.gitlab.com/ee/user/group/) or [project](https://docs.gitlab.com/ee/user/project/). Just sign in with your GitLab account and head over to the [create community](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/communities.md#community-creation) and [create room](https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/rooms.md#room-creation) flows.

 - :white_check_mark: Gitter communities based on [GitLab groups](https://docs.gitlab.com/ee/user/group/)
 - :white_check_mark: Gitter communities based on [GitLab projects](https://docs.gitlab.com/ee/user/project/)
 - :white_check_mark: Gitter rooms based on [GitLab projects](https://docs.gitlab.com/ee/user/project/)
 - :x: Gitter rooms based on your personal user namespace GitLab projects -> https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2397


### What's not implemented yet

Gitter communities/rooms based on GitLab projects from your own personal user namespace are not supported yet but we plan to follow up soon after. You can track the [specific issue](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2397) and our [*Create GitLab based communities and rooms* epic](https://gitlab.com/groups/gitlab-org/-/epics/398).



### Updated create community and create room UI (now using Vue.js)

Alongside these additions, the community and room creation flows have also been updated.
Both simplified to reduce the complexity and now have more clear and actionable errors to help when you run into a sticky point. They're also coded with [Vue.js](https://vuejs.org/) now as part of our migration from [Backone/Marionette](https://marionettejs.com/).

The room creation modal updates give you a lot more freedom around associating a project/repo.
Now you can associate a project/repo with any room regardless of the room name or which community it is part of.
Previously the room name had to match the repo name and be inside a community associated with the GitHub org.

![](https://i.imgur.com/b8Kty6d.png) ![](https://i.imgur.com/yOobB1g.png)
