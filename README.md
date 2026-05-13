# Sadhana

> *Sādhanā (साधना)* is Sanskrit for a daily, disciplined practice. The work you return to until it becomes who you are.

I built Sadhana because every gym app I tried felt like it was made for someone else. Onboarding flows, social feeds, an account to make before I could log anything. I just wanted to track my sets and not lose them when my phone went to sleep mid-workout.

This is that app. Offline first. Built with React Native + Expo. Primary target is **Android** coz I don't own an iPhone, but cant be easily extended for ios, thanks to expo :)

---

## Why I built it the way I did

Three things drove every design choice:

1. **My phone is the source of truth.** All my workout data lives in SQLite on the device. The app never waits for the network during a workout. If I'm in airplane mode for a year, nothing changes.
2. **Sync is a backup, not a leash.** Google Sheets is where I export to. I choose when. If the sheet goes down or I delete it, the app still works.
3. **The rest timer has to be honest.** Android freezes JavaScript when the screen turns off, which is exactly when I'm resting. Most app timers drift or pause. Mine is tied to a real timestamp and pairs with a phone notification, so the count survives the screen going off, the app being backgrounded, even the app being killed.

---

## What it does

### Logging a workout

* Tap to start a session. The total time counts from a real clock, not a ticking number, so it stays right even if I lock the phone for 20 minutes.
* Each set has its own Start and Finish, so I can see how long my actual lifting took, separate from rest.
* A note field per exercise for stuff like "felt heavy" or "form broke on rep 8".
* When I beat my old max for a lift, a 🏆 badge pops up mid-session. It only fires once per exercise so I don't get spammed.
* If I forget to tap Finish Set before tapping Finish Exercise, the set in progress gets saved automatically. I lost too many sets to ever ship that as the default again.

### Rest timer

* Counts down from a real timestamp, not by ticking a number. When Android freezes the app and I come back to it, the number jumps to where it actually should be instead of being stuck.
* A phone notification fires at the end (90 seconds for sets, 120 for moving between exercises). Works even if the app is closed.
* There's a breathing cat 🐈 in the timer ring. No reason. I just like it.
* If you want the long story of why I rewrote the timer (the first version lost rest data), it's in [ARCHITECTURE.md](ARCHITECTURE.md) section 3.2.

### Kg and lb together

I think in kg. But some machines at my gym are labelled in lb and I always get confused. So there's a small `KG | LB` toggle on the weight stepper. I type in whichever the machine uses, the app stores it as kg under the hood (so my history and PR math keep working), and saved sets show the lb value as a hint like `(220 lb)` so I recognise the machine next time.

### History

* Tap any past session to see what I did, total volume, which lifts hit a PR, and how each one compared to my last best.
* Tap any exercise to see every time I've ever logged it.
* The Home screen shows my current streak and how many sessions I've done this week.

### Exercise library

The app ships with a list of common exercises baked in. The real list lives in a Google Sheet I can edit. From Settings, tap Sync Library and the local copy gets replaced with whatever's in the sheet. The sheet is the boss.

The library is what powers autocomplete when I type an exercise name, and it's how the app knows which muscle group each lift belongs to.

### Logging old workouts by hand

If I forget to log live, I can add a session by hand. Pick the date, type in the exercises, save. These get tagged differently from live ones so I can tell them apart later.

### Google Sheets sync

The sheet is both my backup and where I edit the exercise library:

* **Sync to Sheets** sends every session and exercise to the sheet. Re-running is safe.
* **Restore from Sheets** wipes my local sessions and re-imports from the sheet. Doesn't touch the exercise library.
* **Sync Library** pulls the exercise list from the sheet and replaces the local one.
* **Open Spreadsheet** is just a link to open the sheet in my browser.

The whole thing is set up via three env vars (see Setup below). If they're missing, Settings shows me a red banner so I notice instead of getting silent failures.

### Discarding a bad session

Tapped Start Session by accident? End Session, then Discard. The row stays in the database with a marker on it, gets hidden from history and PR math, and survives sync without making a mess of anything.

---

## Setup

```bash
npm install
npm start                # Metro + dev menu
npm run android          # debug build on emulator or device
npm run android:release  # the APK I actually install on my phone
```

### Environment

Create a `.env` in the project root (it's gitignored). Three vars, all need the `EXPO_PUBLIC_` prefix or Expo won't ship them with the bundle:

```
EXPO_PUBLIC_GSHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
EXPO_PUBLIC_GSHEETS_SECRET=<the secret your Apps Script checks for>
EXPO_PUBLIC_GSHEETS_SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/.../edit   # optional
```

The first two are needed for any kind of sync. The third is just so Settings can show a tap-through link to the sheet.

For EAS builds, the same vars need to be added via `eas env:create`. EAS doesn't upload my local `.env`.

### Type check

```bash
npx tsc --noEmit
```

No tests yet. Lint with `npm run lint`.

---

## Tech stack

* React Native + Expo, with file-based routing via `expo-router`.
* SQLite via `expo-sqlite`, sync APIs everywhere (`getAllSync`, `runSync`, etc.).
* `expo-notifications` for the rest-done alert.
* Apps Script + Google Sheets as the backup and the library editor.
* No backend, no accounts, no login.

---

## Versioning

The Home screen shows the version from `app.json` so I can tell which build is on my device. I bump it semver style:

* **patch** for bug fixes and small tweaks
* **minor** for new features or schema changes
* **major** for breaking changes (database wipe, sync contract change)

---

## More docs

* **[ARCHITECTURE.md](ARCHITECTURE.md)** is the deep dive. How the layers fit, the bootstrap, the sync flows with diagrams, why the rest timer is built the way it is.
* **[INTELLIGENCE.md](INTELLIGENCE.md)** is my list of ideas for making the app feel smarter (progressive overload suggestions, estimated 1RM trends, etc.). Nothing built yet, just notes.
* **[CLAUDE.md](CLAUDE.md)** is the guide for Claude Code working in this repo. Conventions, principles, and what not to refactor.
