# Red Giveaway Discord Bot

This is the source code for the Red Giveaway Discord bot, created as per your specifications.

## Features

*   **Giveaway Management:** Start, end, reroll, and delete giveaways.
*   **Command Types:** Supports both slash commands (e.g., `/gstart`) and prefix commands (default prefix: `?`, e.g., `?gstart`).
*   **Multilingual Support:** Supports English (en) and Arabic (ar).
    *   Server language can be set using the `setlang` command.
*   **Red Theme:** Embeds and responses are themed with a red color.
*   **Persistent Storage (Basic):** Giveaway data is stored in `giveaways.json`. Server language settings are currently in-memory but can be extended for persistence (see comments in `commands/setlang.js` and `index.js`).

## File Structure

```
.
├── commands/               # Command files
│   ├── gdelete.js
│   ├── gend.js
│   ├── glist.js
│   ├── greroll.js
│   ├── gstart.js
│   └── setlang.js
├── locales/                # Language files
│   ├── ar.json
│   └── en.json
├── config.json             # Bot configuration (token, prefix, theme color)
├── giveaways.json          # Stores active and past giveaway data
├── index.js                # Main bot file
├── package-lock.json
├── package.json
├── README.md               # This file
└── todo.md                 # Development task checklist
```

## Setup Instructions

1.  **Prerequisites:**
    *   Node.js (v16.9.0 or newer recommended for discord.js v14)
    *   npm (usually comes with Node.js)

2.  **Download Files:**
    *   Download all the files from the provided archive.

3.  **Install Dependencies:**
    *   Open a terminal or command prompt in the project's root directory (where `package.json` is located).
    *   Run the command: `npm install`

4.  **Configure the Bot:**
    *   Open the `config.json` file.
    *   Replace `"YOUR_DISCORD_BOT_TOKEN_HERE"` with your actual Discord bot token. You can get this from the [Discord Developer Portal](https://discord.com/developers/applications).
    *   You can also change the default `prefix` (currently `"?"`) or `redThemeColor` (currently `"#FF0000"`) if desired.

5.  **Register Slash Commands (First Run or Changes):**
    *   The bot attempts to register slash commands globally when it starts. This might take up to an hour to propagate to all servers for global commands.
    *   Ensure your bot has the `application.commands` scope when you invite it to your server.

6.  **Run the Bot:**
    *   In the terminal, from the project's root directory, run: `node index.js`
    *   You should see a message like `Ready! Logged in as YourBotName#1234` in the console.

## Bot Permissions

When inviting the bot to your server, ensure it has the following permissions for full functionality:

*   **View Channels**
*   **Send Messages**
*   **Send Messages in Threads**
*   **Embed Links**
*   **Attach Files** (if you plan to extend it for attachments)
*   **Read Message History** (to fetch reactions for giveaways)
*   **Add Reactions** (to add the 🎉 reaction to giveaway messages)
*   **Use External Emojis** (if you use custom emojis in embeds)
*   **Manage Messages** (optional, if you want the bot to be able to delete its own messages or user commands more broadly - `gdelete` currently tries to delete the giveaway message itself).

For slash commands, ensure the `application.commands` scope is enabled during invitation.

## Command Usage

Replace `?` with your configured prefix if you changed it.

*   **Start Giveaway:**
    *   Slash: `/gstart duration:<time> winners:<count> prize:<name>`
    *   Prefix: `?gstart <time> <count> <name>`
    *   Example: `?gstart 1d 1 Test Prize` or `/gstart duration:1d winners:1 prize:Test Prize`
    *   `<time>` format: `10s` (seconds), `5m` (minutes), `2h` (hours), `1d` (days)

*   **End Giveaway Manually:**
    *   Slash: `/gend message_id:<id>`
    *   Prefix: `?gend <id>`
    *   `<id>` is the message ID of the giveaway embed.

*   **Reroll Winner(s):**
    *   Slash: `/greroll message_id:<id>`
    *   Prefix: `?greroll <id>`

*   **Delete Giveaway:**
    *   Slash: `/gdelete message_id:<id>`
    *   Prefix: `?gdelete <id>`

*   **List Active Giveaways:**
    *   Slash: `/glist`
    *   Prefix: `?glist`

*   **Set Language:**
    *   Slash: `/setlang language:<en|ar>`
    *   Prefix: `?setlang <en|ar>`

## Notes

*   The `gstart`, `gend`, `greroll`, and `gdelete` commands typically require the user to have "Manage Server" (ManageGuild) permissions.
*   The `setlang` command also requires "Manage Server" permissions.
*   Giveaway data in `giveaways.json` is updated automatically. Ensure the bot has write permissions to this file.
*   The automatic ending of giveaways relies on `setTimeout`. For a very large number of concurrent giveaways or very long durations, a more robust scheduling system (e.g., using a database and a cron-like job) would be recommended for production environments, but this setup is fine for most use cases.

Let me know if you have any questions!
