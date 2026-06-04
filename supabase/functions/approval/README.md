# `approval` Edge Function — orchestrator

Authoritative entry point for **transitioning** a schedule version through the
approval workflow (single-step route: author submits → ГИП approves/rejects).
Reads stay on the client under RLS; only transitions go through here so the
state machine, baseline freeze and audit trail are enforced in one place.

## Request

`POST /functions/v1/approval` with a user JWT in `Authorization`:

```json
{ "scheduleVersionId": "<uuid>", "action": "approve", "comment": "optional" }
```

`action` is one of: `submit`, `approve`, `reject`, `recall`, `supersede`
(see `workflow.ts`).

## What it does

1. Authenticates the caller via their JWT.
2. Resolves the caller's approval role: `author` (version `created_by`),
   `approver` (a `project_team.role` matching ГИП / lead / owner), else
   `viewer`. Picks the strongest role that permits the action.
3. Validates the transition with the shared state machine (`workflow.ts`, a
   Deno copy of `packages/core/src/approval/workflow.ts`).
4. On `approve`: freezes a baseline — inserts a `baseline_snapshots` row and
   copies the version's tasks into `baseline_tasks`.
5. With the service-role client: updates `approval_status` (and submitted/
   approved metadata + `baseline_id`) on the version, and appends a
   `version_approvals` audit row.

Returns `{ "status": <new>, "baselineId": <uuid|null>, "role": <role> }`, or
`4xx` with `{ "error": "…" }` (422 for a disallowed transition, 403 for a role
that can't perform the action).

## Local / deploy

```bash
supabase functions serve approval     # local
supabase functions deploy approval    # remote
```

Required env (provided automatically on Supabase): `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Keeping the state machine in sync

`workflow.ts` here mirrors `packages/core/src/approval/workflow.ts` (Edge
Functions can't import the pnpm workspace). Change both together; the unit tests
in `@plancore/core` guard the rules.
