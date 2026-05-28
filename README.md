# SSHW2 — 2D Platformer Game

A Mario-style 2D platformer built with **Cocos Creator 2.4.8** (TypeScript) and hosted on **Firebase**.

## Features

- Side-scrolling platformer with multiple levels
- Enemies: Goomba, Flying Goomba, Piranha Plant
- Power-ups: Super Mushroom
- Goal Flag to clear each level
- Online leaderboard (top 10 scores) via Firebase Firestore
- User authentication (sign up / sign in / guest) via Firebase Auth
- Score and progress saved per user

## Project Structure

```
assets/Script/
├── Managers/
│   ├── GameManager.ts       # Score, lives, level state (singleton)
│   └── FirebaseManager.ts   # Firebase Auth + Firestore (singleton)
├── Player/
│   └── PlayerController.ts  # Movement, jump, stomp, death
├── Enemy/
│   ├── Goomba.ts
│   ├── FlyingGoomba.ts
│   └── Enemy.ts
├── Object/
│   ├── QuestionBlock.ts
│   ├── SuperMushroom.ts
│   ├── PiranhaPlant.ts
│   ├── GoalFlag.ts
│   └── TiledMapCollider.ts
├── Camera/
│   └── CameraFollow.ts
└── UI/
    ├── MainMenuUI.ts
    ├── LoginUI.ts
    ├── LeaderboardUI.ts
    ├── GameUI.ts
    ├── GameOverUI.ts
    └── LevelSelectUI.ts
```

## Scene Flow

```
Login → MainMenu → Level1 / LevelSelect / Leaderboard
                         ↓
                      GameOver → MainMenu
```


## Sound Effects (7 SFX)

| Variable | File | Trigger |
|----------|------|---------|
| `jumpSfx` | jump.wav | Player jumps |
| `stompSfx` | stomp.wav | Player stomps an enemy |
| `damageSfx` | powerDown.wav | Player takes damage and shrinks |
| `dieSfx` | loseOneLife.wav | Player dies |
| `powerUpSfx` | PowerUp.mp3 | Player collects a mushroom |
| `spawnSfx` | coin.wav / powerUpAppear.wav | Question block triggered |
| `clearSfx` | levelClear.mp3 | Player reaches the goal flag |

BGM: bgm_1 / bgm_2 / bgm_3 (level background music), Game Over.mp3 (death music).

## Animations

| Subject | Description |
|---------|-------------|
| Mario (small) | Walk, idle, death (sprite sheet) |
| Mario (big) | Walk, idle, death (sprite sheet) |
| Mario grow / shrink | Scale tween on power-up or damage |
| Goomba | Walk cycle (6 fps frame flip) |
| Flying Goomba | Wing flap (8 fps frame flip) |
| Piranha Plant | Mouth open/close (4 fps frame flip) |
| Enemy stomp | Squish scale tween then destroy |
| Main menu title | Sine bob loop (cc.tween) |

## Bonus Features

- **Firebase Login** — sign up and sign in with email/password, or continue as guest
- **Online Leaderboard** — top 10 scores stored in Firestore; only updates if the new score is higher

## Build & Deploy

1. Open project in **Cocos Creator 2.4.8**
2. Build → Web Mobile → output to `build/web-mobile`
3. Deploy:
```bash
firebase deploy --only hosting
```

Live URL: https://sshw2-f82d1.web.app
