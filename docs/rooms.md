# Rooms

Rooms are part of a community.

Rooms are also referred to as "troupes" internally in the codebase for legacy reasons.

All rooms have unlimited message history, public or private.


## People/Roster

You can see who is in the room and add/invite new users via the roster section in the right-toolbar

![](https://i.imgur.com/nW29SY1.png)

#### Eyeballs Disambiguation

Eyeballs are the green and yellow/orange dots on top of the avatars in the people section of a room. They represent the current status or online presence of a person in the room.

![](https://i.imgur.com/MRuIXK4.png)

So what does each color mean?

 - **Green**: Actively looking at the room
 - **Yellow/Orange**: Not actively looking at the room

"Actively looking" equates to whether the window has focus and the room is open.



## Room user

### Leave a room

You can leave a room via **Room settings dropdown** -> **Leave this room**

If you have mad skillz, you can also type "/leave" in the chat room (slash command).

![](https://i.imgur.com/Rc4EVnV.png)


## Room admin

### Room creation

Use the "Add a room" button at the bottom of the conversation list in the left menu to start creating a room.

![](https://i.imgur.com/KxJ2Oym.png)

If you aren't an admin of any communities, you will be redirected to the [create community flow](./communities.md#community-creation).

If you want to associate the room with a GitHub repo, start typing in the the repo name,
and you can select the repo from the typeahead dropdown list.
If you type the full name of the repo, it will auto-associate.
If you don't see the repo listed in the typeahead or isn't being associated, see the [FAQ](./faq.md#why-isnt-my-github-organisation-or-repos-appearing)

![](https://i.imgur.com/8tiwwZM.png)


#### Why isn't my GitHub organisation or repos appearing?

See the [FAQ](./faq.md#why-isn-t-my-github-organisation-or-repos-appearing).


### Room security

**Public rooms**

 - A public room can be seen by everyone

**Private rooms**

 - A room connected to a private repo can be accessed by anyone with access to the repo.
 - A private room with no association can only be accessed if they are manually invited to the room.
 - A private room can also be associated with the community and anyone in the community can join the room. If the community was associated with an org, anyone in the org could join for example

#### Change room security after creation

It is currently not possible to adjust your room security (public/private) after creation,
but we can do it manually for you.

Send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Link to the room on Gitter
 - New desired public/private security or repo/org association
 - Some context behind the change

You can track https://gitlab.com/gitlab-org/gitter/webapp/issues/676 for progress on this issue.



### Room topic/description

A room topic/description will help the community members and new people joining to know what's the purpose of the room.

To set up your room topic, double-click on the area next to the room name in the chat header.

You can also use the `/topic <some topic message>` slash command to set the room topic.

![](https://i.imgur.com/ecdteoh.png)


### Moderation

As an admin of the room, you can delete messages from other users.

You can add new admins for a room via **Room settings dropdown** -> **Permissions** modal


### Restrict room to GitHub users

You can restrict a room to GitHub users via **Room settings dropdown** -> **Settings** -> **Only GitHub users are allowed to join this room.** checkbox

![](https://i.imgur.com/ujd8kHE.png) ![](https://i.imgur.com/oOGoEYw.png)


### Rename a room

If you want to rename a room because a GitHub repo was renamed/transferred, see this [FAQ section instead](./faq.md#what-happens-if-i-rename-something-on-GitHub-org-repo) instead.

Currently, there isn't a way to rename a room in the UI. But you can send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Link to the current Gitter room
 - Desired room name


### Delete a room

If you are a room admin, you can delete a room via **Room settings dropdown** -> **Delete this room**

![](https://i.imgur.com/FqxWgsM.png)
