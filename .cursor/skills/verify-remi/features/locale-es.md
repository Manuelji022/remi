# Locale `/es`

Spanish is a path prefix, not a query param or a header toggle. `getLocaleFromPathname` treats `/es` and `/es/...` as `es`. Messages live in `frontend/src/i18n/messages.ts`.

## Sub-features

- Home `/es` (`es.index.tsx` reuses `IndexPage`).
- Planner `/es/weekly-menu-planner`.
- Auth `/es/login`, `/es/signup`, `/es/forgot-password`, `/es/reset-password`, `/es/two-factor`.
- Switcher: only inside the preferences dialog, `a.panel-language-switcher`. From English it shows `ES` and its accessible name is `Language: Spanish`.

## How to get to it (user POV)

Visit `http://localhost:3001/es`, or open Preferences on the English planner and click `ES`. The address becomes `/es/weekly-menu-planner`. The logo then points at `/es`. Header link text is `Menú semanal`.

There is no language control on the home page header.

## Driving it with Chrome CDP

1. Navigate to `http://localhost:3001/es`.
2. `document.documentElement.lang` is `es`.
3. After the load event, `document.title` is `Remi - Tu planificador semanal de comidas`. The SSR head contains two `<title>` elements: the route `head()` title stays English (`Remi - Your weekly meal planner`), and the shell adds the Spanish title. A client `useEffect` sets `document.title` from the locale. Assert `document.title` in the browser, not the first `<title>` in the raw HTML.
4. Body text includes `Planifica las comidas de esta semana y compra con una sola lista.`, `Menú semanal`, `Iniciar sesión`, and `Registrarse`.
5. Click `main.home-page a.planner-entry-link`. Path is `/es/weekly-menu-planner`. `h2` is `Todavía no hay Menú Semanal`. Primary button text is `Generar menú`.
6. On a fresh profile, click `Generar menú` once. The body contains `Sin comida planificada en casa` and `Regenerar menú`. It does not contain `Sopa de tomate asado y masa madre` or `Conjunto mock`.
7. Open Preferences. The title is `Preferencias`. Click `EN` (`a.panel-language-switcher`, accessible name `Language: English`). Path loses the `/es` prefix and the dialog closes because it is route state, not a separate URL. English chrome returns. Unsaved preference drafts do not survive that navigation.

## Gotchas

- `html lang` is `es` in the first HTML byte. The browser title is not, until hydration. Do not fail the run for the duplicate English `<title>` in view-source.
- English and Spanish planner state share `localStorage` on `http://localhost:3001`. The saved schedule is the shared document. A guest grid is memory only, so a fresh load of `/es/weekly-menu-planner` starts from `Todavía no hay Menú Semanal`.
- Footer rights in Spanish: `Desarrollado por Manuelji. Todos los derechos reservados.`
- Do not add a header locale toggle as part of verifying this. The switcher is the preferences-panel link.
