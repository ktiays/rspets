# rspets 🐾

Your Digital Companion Sanctuary.

rspets is a modern pet simulation platform that brings warmth to your terminal. Adopt unique companions, nurture them with care, and watch their happiness grow — all through a beautiful HTTP API.

---

## Features

- **Adoption Center** — Bring home a new friend. Choose their name and species, and start your journey together.
- **Health Tracking** — Monitor hunger, happiness, energy, health, and cleanliness in real time.
- **Progression System** — Train your pets to gain experience, level up, and climb the leaderboard.
- **Persistent Memories** — Your companions are safely stored on your machine. Close the app, come back tomorrow — your pets will be waiting exactly where you left them.
- **Rich HTTP API** — Integrate rspets into your own tools and workflows with clean REST endpoints.

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

## Quick Start

### Adopt a pet

```bash
curl -X POST http://localhost:3000/pets \
  -H "Content-Type: application/json" \
  -d '{"name":"Momo","species":"cat"}'
```

### List all pets

```bash
curl http://localhost:3000/pets
```

### Check on your pet

```bash
curl http://localhost:3000/pets/<id>
```

### Pet actions

| Action | Effect | Endpoint |
|--------|--------|----------|
| **Feed** 🍖 | Restores hunger (+20) and boosts health (+5) | `POST /pets/{id}/feed` |
| **Play** 🎾 | Increases happiness (+15) and burns energy (−10) | `POST /pets/{id}/play` |
| **Sleep** 🌙 | Recharges energy (+30) and recovers health (+10) | `POST /pets/{id}/sleep` |
| **Groom** 🛁 | Cleans pet (+30), boosts happiness (+10) and health (+5) | `POST /pets/{id}/groom` |
| **Train** 🏋️ | Gains XP (+25), may level up; costs energy (−15) | `POST /pets/{id}/train` |
| **Heal** 💊 | Restores health (+30) when sick | `POST /pets/{id}/heal` |
| **Explore** 🗺️ | Random adventure with surprises | `POST /pets/{id}/explore` |
| **Rename** ✏️ | Give your pet a new name | `PATCH /pets/{id}/rename` |

---

## API Reference

### Base URL

```
http://localhost:3000
```

All endpoints accept and return `application/json`.

### Pet Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID v4) |
| `name` | string | Pet's given name |
| `species` | string | Pet's species |
| `hunger` | number | Hunger level (0–100, higher is fuller) |
| `happiness` | number | Happiness level (0–100) |
| `energy` | number | Energy level (0–100) |
| `health` | number | Health level (0–100) |
| `cleanliness` | number | Cleanliness level (0–100, default 100) |
| `level` | number | Current level (starting at 1) |
| `experience` | number | Total experience points (starting at 0) |
| `created_at` | string | ISO 8601 timestamp of adoption |
| `last_interaction` | string | ISO 8601 timestamp of last action |

**Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Momo",
  "species": "cat",
  "hunger": 50,
  "happiness": 50,
  "energy": 50,
  "health": 100,
  "cleanliness": 100,
  "level": 1,
  "experience": 0,
  "created_at": "2026-04-18T04:41:14Z",
  "last_interaction": "2026-04-18T04:41:14Z"
}
```

### Backward Compatibility

Old pet saves load seamlessly. Any missing fields receive sensible defaults:
- `cleanliness`: `100`
- `level`: `1`
- `experience`: `0`

### Endpoints

#### `POST /pets` — Adopt a pet

Creates a new companion with starting stats.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Pet's name |
| `species` | string | Yes | Pet's species |

**Example request:**

```bash
curl -X POST http://localhost:3000/pets \
  -H "Content-Type: application/json" \
  -d '{"name":"Momo","species":"cat"}'
```

**Response:** `201 Created`

Returns the newly created [Pet object](#pet-object).

#### `GET /pets` — List all pets

Returns every companion in your sanctuary.

**Example request:**

```bash
curl http://localhost:3000/pets
```

**Response:** `200 OK`

Returns an array of [Pet objects](#pet-object).

#### `GET /pets/:id` — Check on a pet

Retrieves a single pet by its UUID.

**Example request:**

```bash
curl http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK` (Pet object) or `404 Not Found`

#### `POST /pets/:id/feed` — Feed a pet

Restores hunger and gives a small health boost.

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/feed
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

**Stat changes:**
- Hunger: **+20** (max 100)
- Health: **+5** (max 100)

#### `POST /pets/:id/play` — Play with a pet

Boosts happiness at the cost of some energy.

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/play
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

**Stat changes:**
- Happiness: **+15** (max 100)
- Energy: **−10** (min 0)

#### `POST /pets/:id/sleep` — Put a pet to sleep

Recharges energy and recovers health.

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/sleep
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

**Stat changes:**
- Energy: **+30** (max 100)
- Health: **+10** (max 100)

#### `POST /pets/:id/groom` — Groom a pet

Cleans your companion and improves their mood and wellbeing.

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/groom
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

**Stat changes:**
- Cleanliness: **+30** (max 100)
- Happiness: **+10** (max 100)
- Health: **+5** (max 100)

#### `POST /pets/:id/train` — Train a pet

Pushes your pet to learn new skills. Costs energy but rewards experience. When enough XP is accumulated, the pet levels up.

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/train
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

**Stat changes:**
- Experience: **+25**
- Energy: **−15** (min 0)
- May trigger a **level up** when XP threshold is reached.

#### `POST /pets/:id/heal` — Heal a pet

Restores health when your companion is feeling unwell.

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/heal
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

**Stat changes:**
- Health: **+30** (max 100)

#### `POST /pets/:id/explore` — Send a pet on an adventure

Sends your pet on a random adventure. Outcomes vary!

**Example request:**

```bash
curl -X POST http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/explore
```

**Response:** `200 OK` or `404 Not Found`

Returns an **Adventure Result** object:

```json
{
  "outcome": "treasure",
  "message": "Momo found a shiny amulet in the meadow!",
  "pet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Momo",
    "species": "cat",
    "hunger": 50,
    "happiness": 65,
    "energy": 40,
    "health": 100,
    "cleanliness": 90,
    "level": 2,
    "experience": 65,
    "created_at": "2026-04-18T04:41:14Z",
    "last_interaction": "2026-04-18T06:15:00Z"
  }
}
```

**Possible outcomes:**

| Outcome | Description | Typical Effects |
|---------|-------------|-----------------|
| `treasure` | Found something valuable! | +XP, +happiness |
| `injury` | Ouch! A minor accident. | −health, −energy |
| `great_adventure` | An amazing journey! | +XP, +happiness, +health |
| `casual_stroll` | A relaxing walk. | Small +happiness |

#### `PATCH /pets/:id/rename` — Rename a pet

Gives your companion a new name.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | New name for the pet |

**Example request:**

```bash
curl -X PATCH http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/rename \
  -H "Content-Type: application/json" \
  -d '{"name":"Mochi"}'
```

**Response:** `200 OK` (updated Pet object) or `404 Not Found`

#### `GET /pets/:id/status` — Full pet status

Returns a detailed status report including computed fields.

**Example request:**

```bash
curl http://localhost:3000/pets/550e8400-e29b-41d4-a716-446655440000/status
```

**Response:** `200 OK` or `404 Not Found`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Momo",
  "mood": "happy",
  "hours_since_last_interaction": 2.5,
  "species_trait": "Curious",
  "level": 3,
  "experience": 75,
  "xp_to_next_level": 125,
  "stats": {
    "hunger": 50,
    "happiness": 80,
    "energy": 60,
    "health": 100,
    "cleanliness": 90
  }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mood` | string | Current mood derived from overall stats (e.g., `happy`, `sad`, `tired`, `excited`) |
| `hours_since_last_interaction` | number | Hours elapsed since the last care action |
| `species_trait` | string | Innate trait tied to the pet's species |
| `level` | number | Current level |
| `experience` | number | Current XP total |
| `xp_to_next_level` | number | XP remaining to reach the next level |
| `stats` | object | Snapshot of the pet's core stats |

#### `GET /pets/leaderboard` — Pet leaderboard

Returns all pets ranked by level and experience.

**Example request:**

```bash
curl http://localhost:3000/pets/leaderboard
```

**Response:** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Momo",
    "species": "cat",
    "level": 5,
    "experience": 340
  },
  {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "name": "Barnaby",
    "species": "dog",
    "level": 3,
    "experience": 120
  }
]
```

---

## License

Built with warmth.
