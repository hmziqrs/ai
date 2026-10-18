---
id: FRM
title: Forum
milestone: M2
depends_on: [AUTH]
reference_archetypes: [arch:forum-index]
---
# FRM Forum

Discussion forum: categories and thread lists, the thread view, signed-in replies, votes, and the moderation tools an admin uses.

## FRM-1 Categories and thread list

Story: As a visitor, I browse forum categories and the threads in each one.
Depends on: AUTH-2
Evidence: arch:forum-index

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FRM-1.AC1 | Given seeded categories, when a visitor opens /forum, then each category shows its name, thread count and latest activity. | tests/acceptance/frm/index.spec.ts |
| FRM-1.AC2 | Given a category with threads, when the visitor opens it, then threads sort by latest activity with pinned threads first. | tests/acceptance/frm/thread-list.spec.ts |
| FRM-1.AC3 | Given a category with no threads, when the list renders, then it says the category is empty and links to sign-in before starting a thread. | tests/acceptance/frm/empty-category.spec.ts |

## FRM-2 Thread view

Story: As a visitor, I read a thread and its replies in time order.
Depends on: FRM-1
Evidence: arch:forum-thread, journey:read-thread

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FRM-2.AC1 | Given a thread with 40 replies, when a visitor opens it, then the first page shows the opening post and the first 20 replies in time order. | tests/acceptance/frm/thread.spec.ts |
| FRM-2.AC2 | Given a thread URL with an anchor to reply 12, when the page loads, then that reply is scrolled into view and highlighted. | tests/acceptance/frm/anchor.spec.ts |
| FRM-2.AC3 | Given a deleted post, when the thread renders, then the post shows as removed and keeps its place in the sequence. | tests/acceptance/frm/removed-post.spec.ts |

## FRM-3 Post and reply (signed in)

Story: As a signed-in member, I start a thread and reply to one.
Depends on: FRM-2, AUTH-2
Evidence: int:thread-reply, journey:post-reply

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FRM-3.AC1 | Given a signed-in member, when they submit a reply with text, then the reply appears at the end of the thread without a full page reload. | tests/acceptance/frm/reply.spec.ts |
| FRM-3.AC2 | Given a signed-out visitor, when they open the reply form, then the form is replaced by a sign-in prompt and no draft is sent. | tests/acceptance/frm/reply-signed-out.spec.ts |
| FRM-3.AC3 | Given a reply that is empty or longer than 10000 characters, when the member submits it, then the form shows an inline error and nothing is saved. | tests/acceptance/frm/reply-validation.spec.ts |

## FRM-4 Votes

Story: As a signed-in member, I upvote a post once and see the count move.
Depends on: FRM-2
Evidence: int:thread-vote

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FRM-4.AC1 | Given a signed-in member, when they upvote a post, then the count increases by one and the button shows the pressed state. | tests/acceptance/frm/vote.spec.ts |
| FRM-4.AC2 | Given a member who already voted, when they press the vote button again, then the vote is removed and the count returns to its previous value. | tests/acceptance/frm/vote-toggle.spec.ts |
| FRM-4.AC3 | Given two rapid presses, when both requests complete, then the server records one net change and the UI matches the server count. | tests/acceptance/frm/vote-race.spec.ts |

## FRM-5 Moderation (report, hide, lock)

Story: As a member, I report a post, and as an admin, I hide a post or lock a thread.
Depends on: FRM-3, AUTH-4
Evidence: arch:forum-thread

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FRM-5.AC1 | Given a member, when they report a post with a reason, then a report record is created and the reporter sees a confirmation. | tests/acceptance/frm/report.spec.ts |
| FRM-5.AC2 | Given a hidden post, when a visitor opens the thread, then the post body is not sent to the client and a placeholder shows. | tests/acceptance/frm/hide.spec.ts |
| FRM-5.AC3 | Given a locked thread, when a member opens the reply form, then the form is disabled and the lock reason shows. | tests/acceptance/frm/lock.spec.ts |
