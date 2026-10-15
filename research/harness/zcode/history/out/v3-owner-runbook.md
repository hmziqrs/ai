# The V3 Engine — the Product Owner's Runbook

## Read this first

This runbook describes the **approved design** of the V3 engine, exactly as the plan
defines it. The plan is a decision document: the design is settled, and **nothing has
been implemented yet**. So read what follows as your forward-looking guide to what you
approved — never as operating instructions for shipped software. Where the plan leaves a
detail open, this runbook says so plainly instead of inventing it.

Everything here comes from the approved plan itself: the PRD front door, the V3 engine
design, and three hard constraints the plan labels C6, C7, and C8. Those labels are
just plan-section names — they say: the engine's ongoing loop lives in plain code and
files, never in an AI's memory (C6); the engine starts only from an approved PRD (C7);
and one launch carries the whole session (C8).

## The engine in one paragraph

V3 is the autonomous engine: **one long-lived run** — one continuous stretch of engine
work that starts once and, by design, does not stop on its own — that keeps **2 to 3
lanes** busy at the same time. A *lane* is one worker inside the engine — it picks up a single issue and
carries it all the way: claims it, builds it, checks the work, opens a pull request
(GitHub's way of proposing a change for review), and gets it merged. When a lane
finishes an issue it pulls the next ready one, and the run continues **until a human
resolves it** — until a person deliberately decides the run is finished and ends it,
rather than the engine deciding that on its own. Your current engine (V2.2) stays untouched for one-shot jobs — one task
in, verified work out, done. V3 is separate and new.

Three design facts worth knowing:

- **The to-do list lives on GitHub and as files on disk — never inside an AI's
  memory.** A list held in an AI's memory would grow until it broke the run, so the
  plan forbids it. This to-do list of waiting work is the *queue*; because the queue
  lives on GitHub, it also survives every engine self-update.
- **One launch carries the whole session.** A *launch* is the single act of starting
  the engine; the *session* is everything that one start produces, from the beginning
  of the run to its end. A piece of work is never split across
  launches, and the engine never launches another engine.
- **The engine can update its own instructions mid-run** (the plan calls this
  self-mutation) without losing finished work.

Background, for completeness: before V3 is created, the mobile part of the older engine
gets one planned update (Phase 0.5) — mobile checks route through a single command-line
tool, and crash reports join the evidence. V3 inherits that updated mobile lane from day
one. Nothing here is yours to do.

## 1. How a run starts: the front door first, then ONE drag

The engine never starts from a raw goal. A manual, human-in-the-loop **PRD** flow
always runs first. A *PRD (product requirements document)* is a plain-language
description of what will be built, for whom, what "done" means, and what is still an
open question.

### Step 1 — You write a goal

One sentence to one paragraph, in plain words.

### Step 2 — The agent answers with a plain-language overview

The agent returns a PRD overview: what will be built, for whom, what "done" means, and
the open questions. No jargon, no implementation detail.

### Step 3 — You confirm or correct each item

Walk through every item and confirm it or correct it. Your word is the gate.

### Step 4 — Extension rounds

The agent takes your confirmed items one level deeper — behaviors, edge cases,
non-goals, and how the work will be checked — and you confirm again. This repeats until
every item is concrete enough to build. Two rules protect you: every round starts from
your last confirmation (no silent rewrites), and the PRD is saved as a versioned file
on disk, never just chat history.

### Step 5 — The agent files the plan as GitHub issues

One issue per PRD item, with bodies written from the text you confirmed. Each issue
carries a **blocked-by label** — a mark that says "do not start this issue until the
issue named on the label is closed." Together the labels record the order things must
be built in. All the cards land in the Project's **Review** column. (GitHub Projects is
GitHub's built-in board: work shown as cards in columns.)

### Step 6 — The ONE start signal: you drag a card into Approved

You can edit the issues freely in GitHub first. Then, when you are ready, you drag a
card into the **Approved** column. **That drag — and nothing else — starts a lane.**
There is no other start button anywhere in the design.

### What "ready" means, exactly

An issue is ready for a lane only when all three of these hold:

1. its card sits in the **Approved** column,
2. every blocked-by blocker on it is closed, and
3. it is not already claimed by another lane.

## 2. How to watch it

### The board mirrors the engine

The GitHub Project board's columns mirror the state of the lanes:

| Column | Plain meaning |
|---|---|
| Draft | The board's early column. The plan lists it but does not describe it further. |
| Approved | You dragged the card here. The issue is now eligible for a lane. |
| In Progress | A lane has claimed the issue and is working on it. |
| In Review | The change is up as a pull request, awaiting review and merge. |
| Done | Finished — merged. |
| Failed | The lane tried this issue and reported openly that it could not finish it — an *honest failure*, a truthful dead end rather than a breakdown. |
| Backlog | The lane set the issue aside (ended "backlogged") rather than finishing it. |

GitHub is the only queue surface — the one and only place the queue (that to-do list
of waiting work) lives; there is no other tracker to check. Whatever you want to know
about what the engine is doing, the board is where it shows.

### Cycle reports

Each lane works in *rounds*: one round is one lane's trip through a single issue, from
claiming it to finishing it. Each round closes with a heartbeat (a "still here"
signal), labels marking the outcome, and a **cycle report** — a short written summary
of what that round did (the plan calls it a CycleReport). So expect a report each time
a lane finishes an issue, not at fixed times; a stretch with no report just means no
lane has finished an issue yet. A round is not the same thing as a scheduling window
(section 3): rounds are trips through issues; windows are stretches of engine time.

### The watchdog

A **watchdog** — a small checker that runs on a timer (a "cron", a scheduled background
job) outside the engine — guards the run's liveness: that it is still alive. The plan
commits that this outside watcher exists; it does not spell out what the watchdog does
when it finds the run silent.

## 3. How to pause or stop it — the honest answer

**There is no pause button.** The design does not define one.

**There is no kill command.** The design does not define one of those either.

The run ends in exactly two ways:

1. **An explicit stop** by you.
2. **Human resolution** of the run — you, or a person you trust, deliberately deciding
   the run is finished and bringing it to a close.

The plan names these two ends and no others. It does not describe the exact act for
either one: no button, board move, or command is named for the explicit stop, and none
is named for resolving the run either. Both mechanisms belong to the build, and this
runbook will not invent them. What the design commits to is the boundary: these two,
and only these two, end the run — nothing the engine does on its own ever does.

### What can look like a pause, but is not one

The engine runs in **bounded scheduling windows** — fixed-length stretches of running,
like shifts. It cannot run as one endless internal loop, because such a loop would hit
system limits and die. So the plan makes window chaining *the designed mechanism*, not
a fallback: at each window boundary the engine chains into the next segment by
**amend/resume** — the current segment stops, a successor segment starts as its
continuation, and all finished work is imported as a **warm cache** (saved work that is
never redone). A quiet moment at a window boundary is normal operation — not a pause,
and not a failure. And no new launch happens at a boundary: the same run continues in
its next segment (its next stretch of work), with everything it has already finished.

## 4. What "resolved" means — and what never stops the run

- **Only human resolution or an explicit stop ends the run.** Those are the only two
  endings the design allows.
- **Merging or closing issues never stops it.** When a lane merges its issue, it
  simply pulls the next ready issue. Closing issues yourself does not stop it either.
- **The engine does NOT halt itself when the Done column fills.** This is the most
  important sentence in this runbook. A full Done column means the lanes move on to
  the next ready issues — the run keeps going. The run does not end because the board
  looks finished.
- **A lane ending is not the run ending.** Each lane finishes one of three ways —
  merged, honestly failed (reported truthfully as not done), or backlogged — and
  none of the three ends the run.
- **Triage rejecting an issue back to PRD is normal, not failure.** Triage is the
  engine's first check on a claimed issue, testing it against the approved plan. If
  the plan text is not actionable enough, triage sends the issue back to the PRD
  stage. The plan calls this a normal outcome: the issue comes back to be sharpened.

## 5. Quick-reference card

Keep this beside you.

**START (in order, every time)**

1. Write your goal — one sentence to one paragraph.
2. Read the agent's plain-language overview; confirm or correct every item.
3. Extension rounds: deepen, confirm, repeat until everything is concrete.
4. The agent files the issues (with blocked-by labels) into the Review column.
5. Edit the issues freely in GitHub if you want.
6. Drag a card into **Approved**. That drag is the ONE start signal.

**READY =** card in Approved + every blocked-by blocker closed + not already claimed.

**WATCH**

- Board columns mirror the lanes: Draft, Approved, In Progress, In Review, Done,
  Failed, Backlog.
- Cycle report after every round.
- Watchdog checks liveness from outside the run.
- Queue lives on GitHub and on disk — never inside an AI's memory.

**STOP — READ TWICE**

- No pause button exists in the design. No kill command exists either.
- Only two ends: an explicit stop, or human resolution (a person deliberately
  ending the run). Neither act is spelled out in the design yet.
- Merging or closing issues never stops the run.
- A full Done column never stops the run — lanes just pull the next ready issue.

**NORMAL, NOT FAILURE**

- Quiet moments at window boundaries (bounded windows chained by amend/resume with
  warm cache — the engine's designed way of running on).
- Triage rejecting an issue back to PRD.
- A lane ending honestly failed (reported truthfully as not done) or backlogged.
