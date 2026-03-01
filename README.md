# Polytoria Friend Request Blocker

A Chrome/Chromium extension that automatically declines incoming friend requests from accounts you choose on `polytoria.com`.

## Features

- Block by **username** or **numeric user ID** (case-insensitive for usernames).
- Auto-detects Polytoria's friend request controls and presses **Decline** automatically for blocked entries.
- Supports current friend request markup (e.g. `.userlink-default`, `data-user-id`, `declineFriendRequest(this)`).
- Simple popup UI to add/remove blocked entries.
- Uses `chrome.storage.sync` to keep your blocklist synced in your browser profile.

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder (`polytoria-blocker`).

## Usage

1. Click the extension icon.
2. Add usernames and/or user IDs you want blocked (examples: `11H`, `463353`).
3. Open `https://polytoria.com/my/friends`.
4. Incoming requests from blocked entries are auto-declined.

## Notes

- `ExampleUser` and `exampleuser` are treated as the same username.
- If Polytoria significantly changes its request DOM structure, `content.js` selectors may need updates.
