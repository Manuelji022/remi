# Orca workflow

This repo is worked on through Orca. Use the `orca` CLI for worktrees, terminals and agents, not raw `git worktree` or a non-Orca subagent tool. The CLI changes between releases, so load the current contract before using it and trust it over the examples below:

- `orca skills get orca-cli` for worktrees, terminals, handoffs and the embedded browser.
- `orca skills get orchestration` for supervised workers, tasks, messages and decision gates.

If your prompt starts with an Orca dispatch preamble (Task and Dispatch IDs), you are a worker. Follow the preamble, do only that task, and skip the rest of this file.

## Roles and models

Strong models decide and review. Cheaper models execute. Work is spread across Claude and Codex so neither provider's quota carries the whole run: Claude spends tokens on decisions, frontend work and verification, Codex on the bulk of implementation and review.

| Role                                        | Agent and model                                                                                 | Responsibility                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinator (the session the user talks to) | Claude, `opus`, medium effort                                                                   | Plans, splits work into tasks, makes product and architecture decisions, answers worker questions, accepts or rejects results             |
| Implementation worker (default)             | Codex, `gpt-6.1-sol`, medium effort                                                             | Implements one well-scoped task, runs typecheck and lint, reports with evidence                                                           |
| Mechanical frontend worker                  | Claude, `haiku`                                                                                 | Copy changes, class and design-token tweaks, moving components, trivial component variants                                                |
| Mechanical worker                           | pi (its configured model, currently `gpt-6-luna`); Codex `gpt-6-luna` at low effort as fallback | Other mechanical work: renames, moving files, formatting changes, docs                                                                    |
| Secondary implementation worker             | Codex, `gpt-6-luna`, max effort                                                                 | Simpler, well-bounded tasks in a large wave                                                                                |
| Frontend worker                             | Claude, `sonnet`, medium effort                                                                 | UI work: pages, components, styling, the design system, client-side behavior                                                              |
| Acceptance verifier                         | Claude, `haiku`                                                                                 | Runs the spec's acceptance checks on a finished task and reports pass or fail with the output. Does not judge code quality, does not edit |
| Routine reviewer                            | Codex, `gpt-6-astra`, low effort                                                                | Reviews a worker's diff against its spec. Reports findings, does not edit                                                                 |
| High-risk reviewer                          | Claude, `opus`, medium effort                                                                   | Reviews high-risk changes (see below), in addition to the routine review                                                                  |

- Workers escalate instead of guessing. When the spec doesn't settle a decision, use `orca orchestration ask` and wait. Product, architecture, schema, auth and new-dependency decisions always belong to the coordinator, never to a worker of either provider.
- Effort caps: `opus` never runs above medium, and `gpt-6-astra` always runs at low.
- High-risk changes are changes to `db/schema.ts`, auth or session handling, or anything touching environment variables. They never go to `gpt-6-luna`. They use `gpt-6.1-sol` at high effort (`sonnet` if the task is frontend), and always get the Opus review.
- Frontend tasks go to `sonnet`. Other implementation tasks go to `gpt-6.1-sol`, except that in a wave of more than three, the simpler, well-bounded ones go to `gpt-6-luna` at max effort.
- A task that mixes frontend and backend work is split into one frontend task and one backend task.
- `haiku` only does mechanical frontend work and acceptance verification. It never implements real logic, never touches high-risk changes and never reviews code.
- Every finished task is verified before it is reviewed. A task that fails verification goes back to the coordinator, which dispatches a fix. Reviewers only see tasks that passed.
- If a worker fails a task, retry it once with the other provider before the coordinator takes it over.
- Nobody reviews their own work. The reviewer is always a fresh worker. Review findings go back to the coordinator, which dispatches fixes to a worker.
- Orca can't pass `--model` or `--effort` to pi. Pi always runs the model in `~/.pi/agent/settings.json`, which currently uses the `openai-codex` provider, so pi draws on the same quota as Codex. Use pi only for mechanical tasks unless that config changes.
- The Codex model IDs above were current in October 2026. When Codex ships new ones, update this table rather than guessing IDs in a spec.
- Don't orchestrate small work. If the coordinator can finish it directly in a few minutes, it does. Spawn workers when the work splits into independent parts or would flood the coordinator's context.
- Workers running in parallel own disjoint files. Two workers never edit the same file in the same wave. Use `--worktree new-child` when parallel workers need full isolation.
- Confirm the model a worker actually got from `launch.effective` in the start receipt, not from the flags you passed.

## Parallel waves

The default shape of a run is a wave of workers running at the same time, one small task each.

- Split work into tasks that are individual, specific and easy to verify. One task produces one result, such as a component, an API route or a migration, and can be checked with one command or one artifact.
- Start every independent task in the wave before waiting on any of them. Add dependencies only for real ordering, and prefer several waves over long chains.
- If a task's acceptance can't be written as a concrete check, split it further or keep it with the coordinator.
- Verify and review each finished task on its own, then start the next wave.
