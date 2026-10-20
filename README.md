# Beijing Winter Trip

To-do list, day-by-day plan and who-owes-what for the three of us. 24 Dec 2026 – 4 Jan 2027.

## Run it

```
npm install
npm start
```

Open http://localhost:3000. The first time it starts, it prints a **trip code** in the terminal. Each friend needs that code to create an account.

## How it works

- **Login:** email and password. Passwords are hashed with bcrypt. Sessions last 30 days in an HttpOnly cookie.
- **Database:** SQLite, saved to `trip.db` in this folder. Back that file up to keep your data.
- **First run:** loads the plan from `seed.json` (to-dos, day plans, ideas). To start over, delete `trip.db` and restart.
- **Live updates:** each open page checks for changes every few seconds.

## Settings (optional)

| Variable | What it does | Default |
|---|---|---|
| `PORT` | Port to listen on | `3000` |
| `TRIP_CODE` | Fixed sign-up code | random, saved in the database |
| `DB_PATH` | Where the database file lives | `./trip.db` |

## Files

- `server.js`: API, login and database
- `public/`: the app (`index.html`, `app.js`, `styles.css`)
- `seed.json`: starting trip plan
- `trip.html`: the older claude.ai version of the app
