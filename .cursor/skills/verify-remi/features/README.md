# Remi feature map

Primary surface: TanStack Start UI at `http://localhost:3001/` (package `frontend`). Drive only after `scripts/doctor.sh` exits 0. Selectors are in the page source; there is no `data-testid` layer.

| Feature | Route | File |
| --- | --- | --- |
| Home | `/` | [home.md](home.md) |
| Auth sign-in | `/login` | [auth-sign-in.md](auth-sign-in.md) |
| Weekly menu planner | `/weekly-menu-planner` | [weekly-menu-planner.md](weekly-menu-planner.md) |
| Preferences and recipes | dialog on the planner | [preferences.md](preferences.md) |
| Spanish locale | `/es` | [locale-es.md](locale-es.md) |

Shared chrome on every route:

- `header.site-header` > `nav[aria-label="Primary"]`
- `a.header-logo` accessible name `Remi home` → `/` or `/es` for the active locale
- `a.planner-entry-link` in the header → localized weekly menu path
- Logged out: `a.header-auth-link` text `Log in` and `Sign up` (Spanish: `Iniciar sesión`, `Registrarse`)
- Logged in: `.header-user` plus `button.header-auth-button` text `Log out`
- `footer.footer` contains the current year and `Developed by Manuelji. All rights reserved.`

Related routes that are part of auth, not separate features: `/signup`, `/forgot-password`, `/reset-password`, `/two-factor`, and the `/es/...` copies of each. API: `/api/auth/*`.

Out of this map: recipe database schema, Drizzle migrations, and `infraestructure/postgres` bring-up beyond the auth-submit line `doctor.sh` already prints.
