# rspets 🐾

Your Digital Companion Sanctuary.

rspets is a modern pet simulation platform that brings warmth to your terminal. Adopt unique companions, nurture them with care, and watch their happiness grow — all through a beautiful HTTP API.

---

## Features

- **Adoption Center** — Bring home a new friend. Choose their name and species, and start your journey together.
- **Health Tracking** — Monitor hunger, happiness, energy, and health in real time.
- **Persistent Memories** — Your companions are safely stored on your machine. Close the app, come back tomorrow — your pets will be waiting exactly where you left them.
- **Rich HTTP API** — Integrate rspets into your own tools and workflows with clean REST endpoints.

---

## Quick Start

### Adopt a pet

```bash
curl -X POST http://localhost:3000/pets \
  -H "Content-Type: application/json" \
  -d '{"name":"Momo","species":"cat"}'
```

### Check on your pet

```bash
curl http://localhost:3000/pets/<id>
```

### Care actions

| Action | Effect | Endpoint |
|--------|--------|----------|
| **Feed** 🍖 | Restore hunger levels and boost health | `POST /pets/{id}/feed` |
| **Play** 🎾 | Increase happiness and build your bond | `POST /pets/{id}/play` |
| **Sleep** 🌙 | Recharge energy and recover health | `POST /pets/{id}/sleep` |

---

## Installation

```bash
curl -sL https://raw.githubusercontent.com/ktiays/rspets/main/install.sh | bash
```

To uninstall:

```bash
curl -sL https://raw.githubusercontent.com/ktiays/rspets/main/install.sh | bash -s -- uninstall
```

## Configuration

After installation, create your configuration file in the `~/.rspets/` directory.

The config file can be written as TOML or JSON. It supports the following keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `session_id` | string | `"default"` | Your personal sanctuary identifier |
| `pet_server_port` | number | `3000` | The local port for the pet API server |

Example `~/.rspets/config.toml`:

```toml
session_id = "my-sanctuary"
pet_server_port = 3000
```

Then start rspets at login:

- **macOS:**
  ```bash
  launchctl load -w ~/Library/LaunchAgents/me.ktiays.rspets.plist
  ```

- **Linux:**
  ```bash
  systemctl --user enable --now rspets
  ```

---

## License

Built with warmth.
