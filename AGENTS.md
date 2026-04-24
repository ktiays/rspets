# rspets Agent API Guide

> This document is designed for AI Agents (e.g., OpenClaw, coding assistants) that need to interact with the rspets HTTP API.
>
> Base URL: `http://localhost:3000`
> Content-Type: `application/json`

---

## System Overview

rspets is a virtual pet simulation with three interconnected layers:

1. **Users** — Own pets, accumulate Pet Coins, trigger gacha rolls.
2. **Pets** — Have stats, moods, skills, and can participate in battles.
3. **Battles** — Turn-based 1v1 combat between two pets using equipped skills.

### Core Workflow

```
Create User → Gacha Pet → Care/Train → Check Skills → Equip Skills → Battle
```

### Key Constraints (Agent Must Obey)

| Constraint | Value | Behavior If Violated |
|------------|-------|---------------------|
| Max pets per user | 15 | `409 pet_limit_reached` |
| Gacha cooldown | 10 min | `429 gacha_cooldown` |
| Gacha cost (after first) | 50 Pet Coins | `402 not_enough_pet_coins` |
| Daily XP cap per pet | 300 | `429 daily_experience_limit_reached` |
| Global interaction cooldown | 2 min per pet | `429 global_interaction_cooldown` |
| Play cooldown | 5 min | `429 play_cooldown` |
| Groom cooldown | 10 min | `429 groom_cooldown` |
| Train cooldown | 10 min | `429 train_cooldown` |
| Explore cooldown | 15 min | `429 explore_cooldown` |
| Battle cooldown | 5 min per pet | `429 battle_cooldown` |
| Battle energy requirement | >= 30 | `409 battle_not_enough_energy` |
| Battle health requirement | >= 50 | `409 battle_not_healthy_enough` |
| Max level difference in battle | 15 | `409 level_difference_too_high` |
| Skills per pet in battle | 1–4 equipped | `409 no_equipped_skills` |

---

## Entity Relationships

```
User (1) ───────< (N) Pet
  │                  │
  │                  ├──> SpeciesTemplate (element, rarity, base_stats, skill_pool)
  │                  ├──> PetSkill (learned skills, equipped flag)
  │                  └──> Battle (challenger or defender)
  │
  └──> UserResource (pet_coins, gacha_pity_counter, starter_gacha_claimed)

Battle (1) ──────> BattleRuntimeState (turn log, HP, stages, status)
```

### Decision: When to Create a User

- If the user wants to adopt a pet and no `user_id` is known, **create a user first** via `POST /users`.
- A user's pets become strays if the user is deleted.

### Decision: How to Obtain a Pet

- **Never** use `POST /pets` — it returns `410 Gone`.
- Always use `POST /pets/gacha` with a valid `user_id`.
- The first gacha roll per user is **free**.
- Duplicate species are converted to 10 Pet Coins (no pet object returned).

### Decision: How to Battle

1. Ensure both pets are **owned** (not strays).
2. Check both pets have **at least 1 equipped skill** (`GET /pets/{id}/skills`).
3. Ensure both pets meet energy (>=30) and health (>=50) requirements.
4. Ensure level difference <= 15.
5. Create battle via `POST /battles`.
6. Resolve turns via `POST /battles/{id}/turn` until `state.is_finished` is `true`.
7. Winner is in `state.winner_pet_id`.

---

## API Endpoints

### Users

#### POST /users
Create a user. **Always do this first** if no user exists.

Request:
```json
{"name": "Alice"}
```

Response (`201`):
```json
{"id": "uuid", "name": "Alice", "created_at": "2026-04-24T..."}
```

#### GET /users
List all users.

Response (`200`): `[User, ...]`

#### GET /users/{id}
Get a single user.

Response (`200`): `User` or `404`

#### PATCH /users/{id}
Update user's name.

Request: `{"name": "New Name"}`

Response (`200`): `User` or `404`

#### DELETE /users/{id}
Delete user. Their pets become strays (`is_stray: true`, `owner_id: null`).

Response (`204`) or `404`

---

### Pets

#### POST /pets/gacha
**The only way to obtain a new pet.**

Request:
```json
{"user_id": "<user-id>"}
```

Response (`201`) — GachaResponse:
```json
{
  "pet": null,              // null if duplicate species
  "species_template_id": "fire_001",
  "species_name": "Ember Cat",
  "rarity": "common",
  "is_new_species": false,
  "remaining_coins": 60,
  "refunded_coins": 10,
  "message": "Rolled Ember Cat. You already own this species..."
}
```

**Agent handling:**
- If `pet` is null, inform the user they received Pet Coins instead.
- If `402` / `429`, wait or inform user of cost/cooldown.

#### GET /pets
List all pets (decay applied).

Response (`200`): `[Pet, ...]`

#### GET /pets/strays
List unowned pets.

Response (`200`): `[Pet, ...]` (filtered to `is_stray: true`)

#### GET /pets/leaderboard
Pets ranked by `level` desc, then `experience` desc.

Response (`200`): `[Pet, ...]`

#### GET /pets/{id}
Get a pet.

Response (`200`): `Pet` or `404`

#### DELETE /pets/{id}
Remove a pet permanently.

Response (`204`) or `404`

#### POST /pets/{id}/adopt
Adopt a stray pet.

Request: `{"user_id": "<user-id>"}`

Response (`200`): `Pet` or `404` / `400`

#### POST /pets/{id}/transfer
Transfer pet to another user.

Request: `{"target_user_id": "<user-id>"}`

Response (`200`): `Pet` or `404` / `400`

#### GET /pets/{id}/status
**Preferred way to check a pet.** Includes mood, battle stats, species description.

Response (`200`) — PetStatusResponse:
```json
{
  "pet": { /* full Pet object */ },
  "mood": "happy",                    // critical, sick, starving, hungry, exhausted, depressed, sad, filthy, ecstatic, happy, sleepy, content
  "hours_since_last_interaction": 2,
  "next_level_experience": 75,        // XP needed to level up
  "species_trait": "A feral cat...",  // species description
  "battle_stats": {
    "hp": 120, "attack": 85, "defense": 60,
    "spatk": 78, "spdef": 55, "speed": 92
  }
}
```

#### GET /pets/{id}/skills
List all learned and equipped skills.

Response (`200`) — PetSkillsResponse:
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
        "category": "physical",   // physical | special | status
        "element": "fire",        // normal | fire | water | grass | electric | ice | ground | flying
        "power": 50,
        "accuracy": 100,
        "effect": "{\"target\":\"Opponent\",\"chance\":20,\"effect\":{\"kind\":\"inflict_status\",\"status\":\"Burn\"}}",
        "description": "A fiery slash that may burn the target."
      }
    }
  ]
}
```

**Agent note:** Skills are auto-learned when pet level >= `learned_at_level`. The system auto-equips up to 4 skills if none are manually equipped.

#### PATCH /pets/{id}/skills/equipment
Replace equipped skill loadout. Must be 1–4 **learned** skill IDs.

Request:
```json
{"skill_ids": ["fire_ember_claw", "normal_tackle"]}
```

Response (`200`): `PetSkillsResponse`

Errors:
- `400 invalid_skill_loadout` — empty or > 4 skills
- `400 skill_not_learned` — skill ID not in learned pool

---

### Care Actions

All return `PetInteractionResponse`:
```json
{"pet": { /* updated Pet */ }, "message": "..."}
```

| Endpoint | Method | Energy | XP | Notes |
|----------|--------|--------|-----|-------|
| `/pets/{id}/feed` | POST | +5 | 0 | Hunger +25, Health +5 |
| `/pets/{id}/play` | POST | -15 | 10 | Happiness +20, Hunger -10. Cooldown 5m. |
| `/pets/{id}/sleep` | POST | +(30+level*2) | 0 | Health +5, Hunger -5 |
| `/pets/{id}/groom` | POST | 0 | 5 | Cleanliness 100, Happiness +10. Cooldown 10m. |
| `/pets/{id}/train` | POST | -20 | 20 | Happiness +5, Hunger -10. Cooldown 10m. |
| `/pets/{id}/heal` | POST | -10 | 0 | Health +30. Requires Health < 90. |
| `/pets/{id}/explore` | POST | -25 | 15-25 | Random event. Cooldown 15m. |
| `/pets/{id}/rename` | PATCH | — | — | Body: `{"name":"New Name"}` |

**Agent care strategy:**
1. If `hunger < 40` → **feed**
2. If `energy < 30` and no immediate battle needed → **sleep**
3. If `health < 90` and not already healthy → **heal**
4. If `cleanliness < 50` → **groom**
5. If `happiness < 50` → **play**
6. If energy and cooldowns allow → **train** or **explore** for XP

Always check response for cooldown errors (`429`) and retry after the indicated seconds.

---

### Battles

#### POST /battles
Create a 1v1 battle.

Request:
```json
{
  "challenger_pet_id": "<pet-a-id>",
  "defender_pet_id": "<pet-b-id>"
}
```

Response (`201`) — BattleView:
```json
{
  "battle": {
    "id": "...",
    "challenger_pet_id": "...",
    "defender_pet_id": "...",
    "winner_pet_id": null,
    "started_at": "...",
    "ended_at": null,
    "battle_log": null
  },
  "state": {
    "turn": 1,
    "challenger": {
      "pet_id": "...",
      "name": "...",
      "species_name": "...",
      "species_template_id": "...",
      "element": "fire",
      "level": 5,
      "owner_id": "...",
      "current_hp": 120,
      "max_hp": 120,
      "status": null,           // Poison | Burn | Paralysis | Freeze
      "stats": {"hp":120, "attack":85, ...},
      "stages": {"attack":0, "defense":0, "spatk":0, "spdef":0, "speed":0},
      "equipped_skills": [ /* PetSkillDetail */ ]
    },
    "defender": { /* same structure */ },
    "turns": [],
    "is_finished": false,
    "winner_pet_id": null
  }
}
```

#### GET /battles/{id}
Fetch current battle state and turn logs.

Response (`200`): `BattleView` or `404`

#### POST /battles/{id}/turn
Resolve one full turn. Both sides select one skill.

Request:
```json
{
  "challenger_skill_id": "<skill-id-from-challenger>",
  "defender_skill_id": "<skill-id-from-defender>"
}
```

Response (`200`): `BattleView` (updated with new turn in `turns` array)

**Agent battle loop:**
```python
battle = create_battle(pet_a, pet_b)
while not battle.state.is_finished:
    # Pick skills (e.g., strongest available, or status moves strategically)
    challenger_skill = pick_skill(battle.state.challenger)
    defender_skill = pick_skill(battle.state.defender)
    battle = resolve_turn(battle.id, challenger_skill, defender_skill)
winner = battle.state.winner_pet_id
```

**Battle resolution details:**
- Action order: Higher `effective_speed` goes first. Tie = 50/50 coin flip.
- Damage formula: Level, Power, offensive/defensive stats, STAB (1.5x if skill element matches pet element), type effectiveness, critical (1.5x), random factor (0.85–1.0).
- Status effects at end of turn: Poison (6% max HP), Burn (3% max HP).
- Paralysis: 25% chance to skip turn. Speed × 0.5.
- Burn: Attack/SpAtk × 0.7.
- Freeze: 20% chance to thaw each turn. Cannot act while frozen.

---

## Data Models

### Pet
```json
{
  "id": "uuid",
  "name": "Ember Cat 1",
  "species": "Ember Cat",
  "owner_id": "user-uuid",
  "adopted_at": "2026-04-24T...",
  "hunger": 80,
  "happiness": 80,
  "energy": 102,
  "health": 100,
  "cleanliness": 100,
  "level": 1,
  "experience": 0,
  "last_interacted_at": null,
  "is_stray": false,
  "species_template_id": "fire_001",
  "element": "fire",
  "rarity": "common",
  "iv_hp": 15, "iv_attack": 20, "iv_defense": 8, "iv_spatk": 12, "iv_spdef": 10, "iv_speed": 25,
  "ev_hp": 0, "ev_attack": 0, "ev_defense": 0, "ev_spatk": 0, "ev_spdef": 0, "ev_speed": 0,
  "daily_exp_gained": 0,
  "last_daily_reset": null,
  "last_train_at": null,
  "last_explore_at": null,
  "last_play_at": null,
  "last_groom_at": null,
  "last_battle_at": null,
  "last_gacha_at": null
}
```

### User
```json
{"id": "uuid", "name": "Alice", "created_at": "2026-04-24T..."}
```

### Skill
```json
{
  "id": "fire_ember_claw",
  "name": "Ember Claw",
  "category": "physical",
  "element": "fire",
  "power": 50,
  "accuracy": 100,
  "effect": "...",
  "description": "A fiery slash that may burn the target."
}
```

---

## Error Handling Guide for Agents

When an API call fails, parse the error response:

```json
{"code": "pet_not_found", "error": "Pet was not found."}
```

### Common Error Codes & Agent Actions

| Code | HTTP Status | Agent Action |
|------|-------------|--------------|
| `user_not_found` | 404 | Create user first, then retry. |
| `pet_not_found` | 404 | Verify pet ID. List pets if needed. |
| `pet_limit_reached` | 409 | Inform user: max 15 pets. Suggest removing one. |
| `gacha_cooldown` | 429 | Wait `remaining_seconds` before retry. |
| `not_enough_pet_coins` | 402 | Inform user they need more Pet Coins. Suggest battling. |
| `stray_pet` | 409 | This action requires an owned pet. Cannot act on strays. |
| `already_healthy` | 409 | Health >= 90. Skip heal action. |
| `not_enough_energy` | 409 | Pet needs rest (sleep/feed) before this action. |
| `global_interaction_cooldown` | 429 | Wait `remaining_seconds` (up to 2 min). |
| `play_cooldown` / `groom_cooldown` / `train_cooldown` / `explore_cooldown` | 429 | Wait `remaining_seconds` before retry. |
| `daily_experience_limit_reached` | 429 | Pet hit 300 XP today. No more XP gains until UTC midnight. |
| `battle_not_found` | 404 | Verify battle ID. |
| `same_pet` | 400 | Pick two different pets. |
| `level_difference_too_high` | 409 | Pick pets with closer levels (diff <= 15). |
| `battle_not_enough_energy` | 409 | Let pet sleep/feed before battling. |
| `battle_not_healthy_enough` | 409 | Heal pet before battling. |
| `battle_cooldown` | 429 | Wait `remaining_seconds` (up to 5 min). |
| `no_equipped_skills` | 409 | Check skills (`GET /pets/{id}/skills`), equip some (`PATCH /pets/{id}/skills/equipment`). |
| `battle_finished` | 409 | Battle already ended. Check winner via `GET /battles/{id}`. |
| `invalid_skill_selection` | 400 | Skill not equipped by that pet. Use only equipped skill IDs. |
| `invalid_skill_loadout` | 400 | Must equip 1–4 skills. |
| `skill_not_learned` | 400 | Pet hasn't learned that skill yet. Check `learned_at_level`. |

---

## Quick Reference: Agent Call Sequence

### Adopt and Raise a Pet
```
POST /users {"name":"User"}
  → user.id
POST /pets/gacha {"user_id":"<user-id>"}
  → pet (or coins if duplicate)
GET /pets/<id>/status
  → check mood, stats, battle_stats
POST /pets/<id>/feed
POST /pets/<id>/play
POST /pets/<id>/train
POST /pets/<id>/explore
```

### Prepare for Battle
```
GET /pets/<id>/skills
  → see learned skills, which are equipped
PATCH /pets/<id>/skills/equipment {"skill_ids":["...","..."]}
  → customize loadout
POST /battles {"challenger_pet_id":"A","defender_pet_id":"B"}
  → battle.id, state
POST /battles/<id>/turn {"challenger_skill_id":"...","defender_skill_id":"..."}
  → repeat until state.is_finished
GET /battles/<id>
  → confirm winner
```

### Adopt a Stray
```
GET /pets/strays
  → find a stray pet
POST /pets/<id>/adopt {"user_id":"<user-id>"}
  → pet is now owned
```
