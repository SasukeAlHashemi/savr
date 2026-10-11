# Savr: Project Context

## What Savr is
A **personal storage hub**. Each user saves links and files into their own repositories and can open them later. It is not a social app.

**Stack:** Next.js (App Router), TypeScript, Supabase (Auth, Postgres, Storage).

## Current features (all working)
- Auth: sign up, log in, email confirmation, log out (Supabase Auth)
- Personal dashboard: own repos, descriptions, content types, item counts
- Create/edit repos (name, optional description, allowed content types)
- Save links (YouTube, X, Dailymotion, general sites) with previews
- File uploads: JPG, PNG, Word, PPTX, Excel, PDF, MP3, MP4, with cards, previews, and download
- Delete saved items
- Share links for a saved item, copied through a popup
- Profiles: unique username and profile picture
- Discover users (search users, visit their profiles)
- Browse repos (case-insensitive search across ALL users, with owner shown in suggestions)
- Secret repos (flag so other users can see a repo exists but not open it)
- Themes: white, black, dim (dim is the original)
- Compact icon-based global nav: profile, repo search, user search, create repo, theme, logout

## Why we are changing it
The scope grew too large. Savr is meant to be personal, so features built for looking at other people's content are being removed.

## Task: remove 3 features

### 1. Discover users: REMOVE
- Remove the user-search UI, its nav icon, its route/page(s), and any API/server actions or queries that support it.
- Remove the ability to visit other users' profile pages, unless a route is still needed for something we keep (check first).

### 2. Browse repos: CHANGE
- Keep the search, but restrict it to **the logged-in user's own repositories only**.
- Remove the owner label from suggestions (all results are the user's own).
- Keep case-insensitive matching and suggestions-while-typing.
- The query must filter by the current user's id, and RLS must enforce it too, not just the UI.

### 3. Secret repos: REMOVE
- Remove the "secret" toggle in create/edit repo forms, any lock/secret badge, and any secret-related logic.
- Everything is private to its owner by default, so the feature has no purpose.
- Database: stop reading/writing the secret column. Only drop it in a migration once nothing references it, and tell me before running any destructive migration.

## Keep unchanged
- Auth, dashboard, create/edit repos, links, file uploads, previews, downloads, delete
- **Share links**: they must still work for a single item. Check whether they depend on any secret/public repo logic or a policy that lets other users read repos. Keep only what share links need.
- Profiles: keep the username and profile picture for the logged-in user (view and edit). Only remove access to *other* users' profiles.
- Themes and the rest of the nav (profile, create repo, theme, logout, own-repo search)

## Security (important)
- Review Supabase RLS policies. Remove any policy that lets a user read other users' repos or items, except what share links strictly require.
- After the change, a logged-in user must only be able to read and write their own repos, items, and files.
- Check Storage bucket policies the same way.

## Working rules
1. First explore the codebase and list every file/route/component/query tied to the 3 features. Show me the list before deleting anything.
2. Work on a new git branch, e.g. `remove-social-features`. Do not touch `main`.
3. Remove dead code completely: unused components, routes, types, imports, and queries. Leave no commented-out code.
4. Keep changes small and separated by feature (one commit per feature).
5. Do not add new features or refactor unrelated code.
6. Keep explanations short and simple. I'm still learning.

## Done when
- [ ] No user-search UI, route, or nav icon remains
- [ ] Repo search only returns my own repos
- [ ] No secret-repo UI or logic remains
- [ ] Share links still work
- [ ] Profile username and picture still work for the logged-in user
- [ ] `npm run build` passes with no TypeScript or lint errors
- [ ] RLS policies verified: a user cannot read another user's repos
- [ ] All three themes still render correctly
