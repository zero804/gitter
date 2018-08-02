# Messages

All rooms have unlimited message history, public or private.


## Writing messages

By default, hitting Enter when a chat message is typed will send the message, **Chat mode**. If you want to write multi-line messages, you can either insert a line break manually (Shift + Enter). Alternatively, you can toggle **Compose mode** where Enter will add a line break without sending a message (Ctrl + Enter will send the message).

There is also toggle button that can be found to the right of the chat input area and will look like the following two icons depending on which mode is activated.

Chat Mode | Compose Mode
--- | ---
![](https://i.imgur.com/nmLvAJo.png) | ![](https://i.imgur.com/yUGHhwV.png)

Additionally, if you type three backticks followed by Enter, we will automagically toggle compose mode (as well as close your backticks for you) so you can easily type in code. When you send the message, compose mode will get toggled back off. Neat, huh?

#### Keyboard shortcuts

`Ctrl + /`: Toggle Normal/Compose Mode

**Normal Mode**

- `Enter` - to send message
- `Shift + Enter` - to go to new line

**Compose Mode**

- `Enter` - to go to new line
- `Shift + Enter` - to go to new line (behaves same as `Enter`)
- `Ctrl + Enter` - to send message


## Message syntax

### Markdown

This is probably one of the reasons you are here in the first place. Gitter supports markdown in chat. Yes, that's right. Markdown. In Chat. Such win.

We not only support basic markdown, but also we do syntax highlighting for code and also support issue mentions and @ mentions.

For those unfamiliar with markdown, [GitLab has a nice Markdown reference doc](https://docs.gitlab.com/ee/user/markdown.html). You can access a simple guide in the Gitter application by clicking on the `M↓` icon to the right of the chat input area.

### KaTeX (math formulas)

We also support [KaTeX](https://khan.github.io/KaTeX/) syntax for math/scientific formula notation.

Example:

Before | After
--- | ---
`$$ f(x) = \int_{-\infty}^\infty\hat f(\xi)\,e^{2 \pi i \xi x}\,d\xi $$` | ![](https://i.imgur.com/XXC1uoj.png)

### Mentions

You can directly mention someone else using the `@username` syntax. As you type their username or real name, it should appear in the typeahead for autocompletion.

If the person you mention has notifications enabled, they will see a notification that they have been mentioned.


### Issuable decorations

When you paste a link to a GitLab/GitHub issue, merge request, or pull request it will decorate into a special link where you can preview the contents without having to click through.

![](https://i.imgur.com/l0C97yR.png)


## Slash commands

We support a few /commands and will continue to add new ones. At the moment, you can do any of the commands listed below.

 - `/leave`: Leaves the chat room.
 - `/query @username`: Go 1:1 with `@username`.
 - `/fav`: Toggles the room as a favourite.
 - `/topic <some imaginative and brilliant description>`: Set the topic of the room to "some imaginative and brilliant text".
 - `/notify-all`: Switch the room to notify you for all messages
 - `/notify-announcements`: Switch the room to notify you for direct mentions and `@/all` announcements
 - `/notify-mute`: Switch the room to notify you only for direct mentions
 - `/me <some message>`: If you know IRC, you'll know what this does
 - `/remove @username`: Removes a user from a conversation. Only available to owners/admin of the conversation.
 - `/ban @username`: Bans a user from a conversation. Only available to owners/admins in public rooms.
 - `/unban @username`: Unbans a user from a conversation. Only available to owners/admins in public rooms.
 - `/collapse`: Collapse the first chat message with embedded media



## Edit messages

You can edit your own messages within the 5 minute edit window. The **Edit** option is available in the message `...` dropdown in the top-right of every message.

You can quickly jump to editing your last message by using the up-arrow keyboard interaction.

![](https://i.imgur.com/28mHUvq.png)


## Searching messages

Search is located in the left menu under the magnifying glass menu bar icon. You can press **Ctrl/Cmd + S** to jump straight to that view.

Search will find rooms across Gitter and messages in the current room.

You can use the `from:username` syntax to only find messages from the specified user (filter).

![](https://i.imgur.com/LYA2Vdf.png)


## Message archive

You can access a rooms message archive via the **Room settings dropdown** -> **Arhives**.

The archive heatmap currently only shows a year but you can manually navigate by changing the URL. You can [track this issue for increasing the heatmap size](https://gitlab.com/gitlab-org/gitter/webapp/issues/785)

![](https://i.imgur.com/L8VrjAn.png)


## Tips for crafting a great message

Some tips to improve your chances of getting a quick response and a great interaction.

### Do's

 - Be patient
 - Describe what you are trying to do, what you have tried so far, and what kind of behavior you are expecting
 - Share a link to what you are talking about
 - Create a demo on [jsFiddle](https://jsfiddle.net/), [CodePen](http://codepen.io/), etc
 - Use \`inline code\`, or actual code _blocks_ (```) when sharing code. We support markdown
 - Use complete sentences and proper grammar, it just makes your question a pain to read otherwise
 - If you figure out a solution to your problem after proposing a question, please post your answer so others don't waste their time trying to answer. It's also a good reference for future onlookers

### Don'ts

 - [Don't ask to ask, just ask your actual question directly](http://sol.gfxile.net/dontask.html)
    - Don't just say "Hello" or introduce yourself and wait for someone to respond, just ask your question
    - Don't ask if anyone is around
    - Don't ask if anyone is familiar with or knows about a specific thing that you are trying to use
 - Don't post across many rooms (cross posting). Post in the most relevant room and be patient
 - Don't ask people to respond to you in a one to one conversation
