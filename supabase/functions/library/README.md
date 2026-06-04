# `library` Edge Function — orchestrator

Authoritative entry point for **mutating** library items. Reads stay on the
client (cached `LibraryStore`); only writes go through here so workflow
transitions, version snapshots and the change log are enforced in one place.

## Request

`POST /functions/v1/library` with a user JWT in `Authorization`:

```json
{ "itemId": "<uuid>", "action": "publish", "note": "optional", "payload": { } }
```

`action` is one of: `submit-for-review`, `approve`, `reject`, `archive`,
`restore`, `publish`, `unpublish` (see `workflow.ts`).

## What it does

1. Authenticates the caller via their JWT.
2. Loads the item and validates the transition with the shared state machine
   (`workflow.ts`, a Deno copy of `packages/core/src/library/workflow.ts`).
3. With the service-role client: updates the item, inserts a snapshot into
   `library_item_versions`, and appends a `library_change_log` entry.

Returns `{ "item": <updated> }`, or `4xx` with `{ "error": "…" }` (422 for a
disallowed transition).

## Local / deploy

```bash
supabase functions serve library     # local
supabase functions deploy library    # remote
```

Required env (provided automatically on Supabase): `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Keeping the state machine in sync

`workflow.ts` here mirrors `packages/core/src/library/workflow.ts` byte-for-byte
(Edge Functions can't import the pnpm workspace). Change both together; the unit
tests in `@plancore/core` guard the rules.
