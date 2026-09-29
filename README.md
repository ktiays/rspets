# rspets 🐾 🐱

Your Digital Companion Sanctuary.

rspets is a modern pet simulation platform that brings warmth to your terminal. Adopt unique companions, nurture them with care, train them for battle, and watch their happiness grow — all through a beautiful HTTP API.

---

## Features

- **Adoption Center** — Bring home a new friend through the gacha system. Each pet is backed by a species template with unique elements, rarities, and battle stats.
- **Health Tracking** — Monitor hunger, happiness, energy, health, and cleanliness in real time.
- **Progression System** — Train your pets to gain experience, level up, unlock skills, and climb the leaderboard.
- **Skill & Battle System** — Equip up to 4 skills per pet and engage in turn-based 1v1 battles with elemental type matchups. Resolve turns yourself or let the server auto-play a whole battle.
- **Care Guidance** — Ask what your pet needs right now: `GET /pets/{id}/next-actions` reports which actions are available, what is recommended, and how long each cooldown has left.
- **Battle Records** — Every pet keeps a win/loss record and battle history, and a win-rate leaderboard ranks the best fighters.
- **Persistent Memories** — Your companions are safely stored in SQLite. Close the app, come back tomorrow — your pets will be waiting exactly where you left them.
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

### 1. Create a user

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}'
```

### 2. Roll your first pet (free!)

```bash
curl -X POST http://localhost:3000/pets/gacha \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<user-id>"}'
```

### 3. Check on your pet

```bash
curl http://localhost:3000/pets/<id>/status
```

### 4. Interact with your pet

```bash
# Feed
curl -X POST http://localhost:3000/pets/<id>/feed

# Play
curl -X POST http://localhost:3000/pets/<id>/play

# Train
curl -X POST http://localhost:3000/pets/<id>/train

# Explore
curl -X POST http://localhost:3000/pets/<id>/explore
```

### 5. Check skills and battle

```bash
# List learned skills
curl http://localhost:3000/pets/<id>/skills

# Create a battle
curl -X POST http://localhost:3000/battles \
  -H "Content-Type: application/json" \
  -d '{"challenger_pet_id":"<pet-a>","defender_pet_id":"<pet-b>"}'

# Resolve a battle turn
curl -X POST http://localhost:3000/battles/<battle-id>/turn \
  -H "Content-Type: application/json" \
  -d '{"challenger_skill_id":"<skill-id>","defender_skill_id":"<skill-id>"}'

# ...or let the server play the whole battle
curl -X POST http://localhost:3000/battles/<battle-id>/auto
```

### 6. Ask what to do next, and check the record

```bash
# What does this pet need right now?
curl http://localhost:3000/pets/<id>/next-actions

# Win/loss record and battle history
curl http://localhost:3000/pets/<id>/battles

# Win-rate leaderboard
curl http://localhost:3000/battles/leaderboard
```

---

## Core Systems

### Users

Every pet must belong to a user. Creating a user is the first step to building your sanctuary.

- `POST /users` — Create a user
- `GET /users` — List all users
- `GET /users/:id` — Get a user
- `PATCH /users/:id` — Update a user's name
- `DELETE /users/:id` — Delete a user (their pets become strays)

### Pets

Pets are now backed by **species templates**. Free-form creation has been replaced with a gacha system that draws from a seeded catalog spanning multiple elements and rarities.

#### Pet Stats

| Stat | Range | Description |
|------|-------|-------------|
| `hunger` | 0–100 | How full your pet is. Decays over time. |
| `happiness` | 0–100 | How happy your pet is. |
| `energy` | `0..max_energy` | Rested state. Naturally regenerates at 10/hour. Max = `100 + level * 2`. |
| `health` | 0–100 | Overall wellness. Drops when neglected. |
| `cleanliness` | 0–100 | Hygiene level. Decays over time. |
| `level` | 1+ | Increases as your pet gains experience. |
| `experience` | 0+ | Accumulates through play, training, and exploration. |
| `daily_exp_gained` | 0–300 | Daily experience budget. Resets at UTC midnight. |

#### Time-Based Decay

When you're away, pet stats decay based on elapsed whole hours since the last interaction:

- Hunger −3/hour
- Happiness −2/hour
- Cleanliness −2/hour
- Health drops faster when multiple care stats are low
- Energy regenerates +10/hour (capped at max)

#### Gacha System

`POST /pets/gacha` is the only way to obtain new pets.

| Rule | Value |
|------|-------|
| First roll | **Free** |
| Cost | 50 Pet Coins |
| Cooldown | 10 minutes per user |
| Pet limit | 15 pets per user |
| Duplicate | Converted to 10 Pet Coins |
| Epic pity | Guaranteed after 30 non-epic rolls |
| Legendary boost | Soft boost after 90 rolls |

### Care Actions

| Action | Effect | Cooldown | Energy Cost | XP Gain |
|--------|--------|----------|-------------|---------|
| **Feed** | Hunger +25, Health +5, Energy +5 | 2 min global | 0 | 0 |
| **Play** | Happiness +20, Energy −15, Hunger −10 | 5 min | 15 | 10 |
| **Sleep** | Energy +(30 + level×2), Health +5, Hunger −5 | 2 min global | 0 | 0 |
| **Groom** | Cleanliness 100, Happiness +10, Health +5 | 10 min | 0 | 5 |
| **Train** | Energy −20, Hunger −10, Happiness +5 | 10 min | 20 | 20 |
| **Heal** | Health +30 (requires Health < 90), Energy −10 | 2 min global | 0 | 0 |
| **Explore** | Random adventure with surprises | 15 min | 30 | 15–25 |

> Any pet can gain at most **300 XP per UTC day**.

#### Next Actions

`GET /pets/:id/next-actions` tells a client what to do now, so it does not have to re-derive the care rules. It evaluates all seven interactions with the same checks the action endpoints use, so `available` always agrees with what the endpoint would accept.

- Each action reports `available`, `recommended`, `priority`, a `reason`, the seconds until its cooldowns lift (`cooldown_remaining_seconds`), and `blocked_by` (the error `code` and `message` the endpoint would return).
- **Care needs come first**: heal below 70 health (urgent below 40), feed below 40 hunger (urgent below 20), sleep below 40 energy (urgent below 20), play below 50 happiness (urgent below 30), and groom below 40 cleanliness.
- **Train and explore** are only recommended once no care need is pending and energy is at least 60.
- When nothing is recommended yet, `next_available_in_seconds` is the wait until the soonest needed action unlocks.
- The response also includes battle readiness (`battle.ready`, its cooldown, and any blocker) and `daily_experience_remaining`.

### Skills & Battles

Each species template carries a skill-learning pool. Pets automatically learn skills when they reach the required level.

- Each pet may equip up to **4 skills** for battle.
- Skills have categories: **Physical**, **Special**, **Status**.
- Skills have elements: **Normal**, **Fire**, **Water**, **Grass**, **Electric**, **Ice**, **Ground**, **Flying**.
- Battles are turn-based 1v1. Both sides select one skill per turn.
- Action order is determined by Speed stat. Ties are coin flips.
- Damage formula includes level, power, offensive/defensive stats, STAB, type effectiveness, critical hits, and random factor.
- Supported status conditions: **Poison**, **Burn**, **Paralysis**, **Freeze**.
- Battle rewards: XP, Pet Coins, and EV gains based on the defeated species' strongest base stat.
- `POST /battles/:id/auto` plays a battle forward on the server. Both pets pick the equipped skill with the best expected damage plus secondary-effect value. It uses the same turn resolution, persistence, and rewards as manual turns.
- Every pet has a win/loss record and paged battle history (`GET /pets/:id/battles`). `GET /battles/leaderboard` ranks pets by win rate.

#### Battle Requirements

| Requirement | Value |
|-------------|-------|
| Energy | >= 30 |
| Health | >= 50 |
| Level difference | <= 15 |
| Equipped skills | At least 1 |
| Cooldown | 5 minutes per pet |

#### Element Effectiveness

| Attacker | Strong Against | Weak Against | Immune Against |
|----------|----------------|--------------|----------------|
| Fire | Grass, Ice | Water | — |
| Water | Fire, Ground | Grass | — |
| Grass | Water, Ground | Fire, Flying | — |
| Electric | Water, Flying | — | Ground |
| Ice | Grass, Ground, Flying | — | — |
| Ground | Fire, Electric | Grass | Flying |
| Flying | Grass, Ground | Electric | — |

---

## API Reference

### Base URL

```
http://localhost:3000
```

All endpoints accept and return `application/json`.

### User Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID v4) |
| `name` | string | User's display name |
| `created_at` | string | ISO 8601 timestamp |

### Pet Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID v4) |
| `name` | string | Pet's given name |
| `species` | string | Species name from template |
| `owner_id` | string? | User ID (null if stray) |
| `adopted_at` | string | ISO 8601 timestamp of adoption |
| `hunger` | number | Hunger level (0–100) |
| `happiness` | number | Happiness level (0–100) |
| `energy` | number | Energy level (0–max_energy) |
| `health` | number | Health level (0–100) |
| `cleanliness` | number | Cleanliness level (0–100) |
| `level` | number | Current level (starting at 1) |
| `experience` | number | Total experience points |
| `last_interacted_at` | string? | ISO 8601 timestamp of last action |
| `is_stray` | boolean | Whether the pet is unowned |
| `species_template_id` | string? | Template ID |
| `element` | string? | Element type |
| `rarity` | string? | Rarity (common/rare/epic/legendary) |
| `iv_hp` … `iv_speed` | number | Individual values (0–31) |
| `ev_hp` … `ev_speed` | number | Effort values |
| `daily_exp_gained` | number | XP gained today (0–300) |

### Backward Compatibility

Old pet saves load seamlessly. Legacy free-form pets are automatically migrated onto the seeded template catalog.

---

### Endpoints

#### Users

##### `POST /users` — Create a user

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User's display name |

**Response:** `201 Created` — User object

##### `GET /users` — List all users

**Response:** `200 OK` — Array of User objects

##### `GET /users/:id` — Get a user

**Response:** `200 OK` (User object) or `404 Not Found`

##### `PATCH /users/:id` — Update a user

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | New display name |

**Response:** `200 OK` (User object) or `404 Not Found`

##### `DELETE /users/:id` — Delete a user

The user's pets become strays.

**Response:** `204 No Content` or `404 Not Found`

---

#### Pets

##### `POST /pets` — Adopt a pet (Deprecated)

**Response:** `410 Gone`

Direct pet creation has been removed. Use `POST /pets/gacha` instead.

##### `POST /pets/gacha` — Roll for a pet

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string | Yes | User performing the gacha |

**Response:** `201 Created` — GachaResponse object

```json
{
  "pet": { /* Pet object, or null if duplicate */ },
  "species_template_id": "fire_001",
  "species_name": "Ember Cat",
  "rarity": "common",
  "is_new_species": true,
  "remaining_coins": 50,
  "refunded_coins": 0,
  "message": "Gacha granted Ember Cat."
}
```

**Error responses:**

| Status | Code | Meaning |
|--------|------|---------|
| 404 | `user_not_found` | User does not exist |
| 409 | `pet_limit_reached` | User already owns 15 pets |
| 429 | `gacha_cooldown` | Gacha is on cooldown |
| 402 | `not_enough_pet_coins` | Not enough Pet Coins |

##### `GET /pets` — List all pets

Returns every companion with decay applied.

**Response:** `200 OK` — Array of Pet objects

##### `GET /pets/strays` — List stray pets

**Response:** `200 OK` — Array of stray Pet objects

##### `GET /pets/leaderboard` — Pet leaderboard

Returns all pets ranked by level and experience.

**Response:** `200 OK` — Array of Pet objects

##### `GET /pets/:id` — Check on a pet

**Response:** `200 OK` (Pet object) or `404 Not Found`

##### `DELETE /pets/:id` — Give up a pet

**Response:** `204 No Content` or `404 Not Found`

##### `POST /pets/:id/adopt` — Adopt a stray pet

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string | Yes | Adopting user |

**Response:** `200 OK` (Pet object) or `404 Not Found` / `400 Bad Request`

##### `POST /pets/:id/transfer` — Transfer a pet

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target_user_id` | string | Yes | Receiving user |

**Response:** `200 OK` (Pet object) or `404 Not Found` / `400 Bad Request`

##### `GET /pets/:id/status` — Full pet status

Returns a detailed status report including computed fields.

**Response:** `200 OK`

```json
{
  "pet": { /* Pet object */ },
  "mood": "happy",
  "hours_since_last_interaction": 2,
  "next_level_experience": 75,
  "species_trait": "A feral cat wrapped in a restless ember tail.",
  "battle_stats": {
    "hp": 120,
    "attack": 85,
    "defense": 60,
    "spatk": 78,
    "spdef": 55,
    "speed": 92
  }
}
```

##### `GET /pets/:id/next-actions` — What should this pet do now?

Evaluates every care interaction against the pet's current state (decay and daily reset applied). Read-only.

**Response:** `200 OK` — NextActionsResponse, or `404 Not Found` (`pet_not_found`)

```json
{
  "pet_id": "...",
  "mood": "hungry",
  "suggested_action": "feed",
  "next_available_in_seconds": null,
  "daily_experience_remaining": 300,
  "actions": [
    {
      "action": "feed",
      "available": true,
      "recommended": true,
      "priority": 1,
      "reason": "Hunger is 35 (below 40).",
      "cooldown_remaining_seconds": 0,
      "blocked_by": null
    },
    {
      "action": "explore",
      "available": false,
      "recommended": false,
      "priority": null,
      "reason": null,
      "cooldown_remaining_seconds": 540,
      "blocked_by": { "code": "explore_cooldown", "message": "..." }
    }
  ],
  "battle": { "ready": true, "cooldown_remaining_seconds": 0, "blocked_by": null }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `suggested_action` | string? | The highest-priority recommended action, if any |
| `next_available_in_seconds` | number? | Only when nothing is recommended: seconds until the soonest needed action unlocks |
| `daily_experience_remaining` | number | XP the pet can still gain today (300 minus `daily_exp_gained`) |
| `actions[]` | array | Recommended actions first in priority order (`priority` 1 = do first), then the rest in the order feed, play, sleep, groom, train, heal, explore |
| `actions[].cooldown_remaining_seconds` | number | Seconds until global and per-action cooldowns lift |
| `battle` | object | Whether the pet can start a battle now, with cooldown and the blocking error if not |

##### `GET /pets/:id/battles` — Battle record and history

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `20` | Battles to return (1–100) |
| `offset` | number | `0` | Battles to skip, newest first |

**Response:** `200 OK` — PetBattleHistoryResponse, or `404 Not Found` (`pet_not_found`)

```json
{
  "pet_id": "...",
  "record": {
    "total_battles": 5,
    "finished_battles": 4,
    "wins": 3,
    "losses": 1,
    "in_progress": 1,
    "win_rate": 0.75
  },
  "limit": 20,
  "offset": 0,
  "battles": [
    {
      "battle_id": "...",
      "challenger_pet_id": "...",
      "defender_pet_id": "...",
      "opponent_pet_id": "...",
      "opponent_name": "Pebble",
      "winner_pet_id": "...",
      "result": "win",
      "turns": 7,
      "started_at": "2026-04-24T...",
      "ended_at": "2026-04-24T..."
    }
  ]
}
```

`result` is `win`, `loss`, or `in_progress` from this pet's point of view. `win_rate` is `wins / finished_battles` (`0.0` until a battle finishes); unfinished battles are excluded.

##### `GET /pets/:id/skills` — List pet skills

**Response:** `200 OK`

```json
{
  "pet_id": "...",
  "skills": [
    {
      "pet_id": "...",
      "skill_id": "fire_ember_claw",
      "learned_at_level": 1,
      "is_equipped": true,
      "skill": {
        "id": "fire_ember_claw",
        "name": "Ember Claw",
        "category": "physical",
        "element": "fire",
        "power": 50,
        "accuracy": 100,
        "effect": "...",
        "description": "A fiery slash that may burn the target."
      }
    }
  ]
}
```

##### `PATCH /pets/:id/skills/equipment` — Equip skills

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skill_ids` | string[] | Yes | 1–4 learned skill IDs to equip |

**Response:** `200 OK` — PetSkillsResponse

---

#### Pet Care Actions

All care action endpoints return a `PetInteractionResponse`:

```json
{
  "pet": { /* updated Pet object */ },
  "message": "You fed Momo. They look satisfied."
}
```

##### `POST /pets/:id/feed` — Feed a pet

**Response:** `200 OK` or `404 Not Found`

##### `POST /pets/:id/play` — Play with a pet

**Response:** `200 OK` or `404 Not Found`

##### `POST /pets/:id/sleep` — Put a pet to sleep

**Response:** `200 OK` or `404 Not Found`

##### `POST /pets/:id/groom` — Groom a pet

**Response:** `200 OK` or `404 Not Found`

##### `POST /pets/:id/train` — Train a pet

**Response:** `200 OK` or `404 Not Found`

##### `POST /pets/:id/heal` — Heal a pet

Returns `409 Conflict` (`already_healthy`) if health >= 90.

**Response:** `200 OK` or `404 Not Found`

##### `POST /pets/:id/explore` — Send a pet on an adventure

**Response:** `200 OK` or `404 Not Found`

##### `PATCH /pets/:id/rename` — Rename a pet

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | New name for the pet |

**Response:** `200 OK` (Pet object) or `404 Not Found`

---

#### Battles

##### `POST /battles` — Create a battle

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `challenger_pet_id` | string | Yes | Attacking pet |
| `defender_pet_id` | string | Yes | Defending pet |

**Response:** `201 Created` — BattleView object

```json
{
  "battle": {
    "id": "...",
    "challenger_pet_id": "...",
    "defender_pet_id": "...",
    "winner_pet_id": null,
    "started_at": "2026-04-24T...",
    "ended_at": null,
    "battle_log": null
  },
  "state": {
    "turn": 1,
    "challenger": { /* BattlePetState */ },
    "defender": { /* BattlePetState */ },
    "turns": [],
    "is_finished": false,
    "winner_pet_id": null
  }
}
```

**Error responses:**

| Status | Code | Meaning |
|--------|------|---------|
| 404 | `pet_not_found` | One or both pets not found |
| 400 | `same_pet` | Both IDs are identical |
| 409 | `stray_pet` | Only owned pets can battle |
| 409 | `level_difference_too_high` | Level gap > 15 |
| 409 | `battle_not_enough_energy` | Pet has < 30 energy |
| 409 | `battle_not_healthy_enough` | Pet has < 50 health |
| 429 | `battle_cooldown` | Pet on battle cooldown |
| 409 | `no_equipped_skills` | Pet has no equipped skills |

##### `GET /battles/:id` — Get battle state

**Response:** `200 OK` (BattleView) or `404 Not Found`

##### `POST /battles/:id/turn` — Resolve a turn

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `challenger_skill_id` | string | Yes | Skill from challenger's equipped set |
| `defender_skill_id` | string | Yes | Skill from defender's equipped set |

**Response:** `200 OK` — BattleView (updated)

**Error responses:**

| Status | Code | Meaning |
|--------|------|---------|
| 404 | `battle_not_found` | Battle does not exist |
| 409 | `battle_finished` | Battle already ended |
| 400 | `invalid_skill_selection` | Skill not equipped by that pet |

##### `POST /battles/:id/auto` — Auto-play a battle

The server picks a skill for both pets each turn (highest expected damage plus secondary-effect value; ties go to the earlier equipped skill) and resolves turns until the battle stops. Persistence and rewards are identical to manual turns.

**Request body (optional):** may be omitted or empty.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `max_turns` | number | No | Turns to play in this call (default `100`, clamped to 1–200) |

**Response:** `200 OK` — BattleView plus:

| Field | Type | Description |
|-------|------|-------------|
| `turns_played` | number | Turns played by this call, not the battle's total |
| `stop_reason` | string | `finished` (a winner was decided), `turn_limit` (`max_turns` reached, battle still in progress), or `stalemate` (both pets fainted from end-of-turn status damage; no winner) |

A battle stopped at `turn_limit` can be continued with another `/auto` call or with `/turn`.

**Error responses:**

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `invalid_request_body` | Body is present but not valid |
| 404 | `battle_not_found` | Battle does not exist |
| 409 | `battle_finished` | Battle already ended |

##### `GET /battles/leaderboard` — Win-rate leaderboard

Ranks pets by win rate over finished battles (ties: more finished battles, then higher level).

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `20` | Entries to return (1–100) |
| `min_battles` | number | `3` | Finished battles a pet needs to be ranked |

**Response:** `200 OK` — Array of entries. A non-numeric query value returns `400 Bad Request`.

```json
[
  {
    "rank": 1,
    "pet_id": "...",
    "pet_name": "Ember Cat 1",
    "owner_id": "...",
    "level": 12,
    "wins": 9,
    "losses": 1,
    "finished_battles": 10,
    "win_rate": 0.9
  }
]
```

---

## License

Built with warmth.
