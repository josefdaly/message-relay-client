# Relay

A private, serverless-feeling chat client built on top of anonymous message queues. No accounts, no phone numbers, no persistent identities — just encrypted queues and keys.

## How it works

Each chat creates a one-directional queue on the server. To have a two-way conversation, both parties create a queue and share their `sid|publicKey` string with each other. Messages are end-to-end encrypted using ECIES (Elliptic Curve Integrated Encryption Scheme) with P-256 — the server only ever sees ciphertext.

Group chats fan-out messages to each member's individual queue, encrypted separately per recipient.

## Features

- E2E encryption (ECIES / AES-GCM-256)
- Direct and group chats
- Opt-in read receipts
- Installable as a PWA
- Desktop app via Tauri

## Project structure

```
src/
  index.html
  style.css
  js/
    config.js       # server URL
    storage.js      # localStorage wrapper
    state.js        # shared app state
    crypto.js       # ECIES encrypt/decrypt
    helpers.js      # utilities
    render.js       # UI rendering
    actions.js      # user actions
    poll.js         # message polling & acks
    main.js         # entry point
  public/
    manifest.json
    sw.js
src-tauri/          # Tauri desktop app config
```

## Development

```bash
npm install
npm run dev       # dev server on localhost:1420
npm run build     # build to dist/
```

## Desktop build

Requires [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npx tauri build --bundles app
# output: src-tauri/target/release/bundle/macos/relay.app
```

## Server

The backend is a simple Flask + Redis message queue. See the companion repo for setup. The server URL is configured in `src/js/config.js`.

## Security notes

- Messages are encrypted client-side before leaving the device
- The server cannot read message content or sender identity
- Private keys are stored in `localStorage` — export your keys before clearing browser storage
- No forward secrecy — key compromise exposes past messages
- Requires HTTPS in production for PWA install and `crypto.subtle`
