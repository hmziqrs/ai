---
id: AUTH
title: Accounts
milestone: M2
depends_on: [FND]
reference_archetypes: [arch:sign-in, arch:account-settings]
---
# AUTH Accounts

Accounts for members and admins: sign-up and sign-in behind an OAuth adapter with a development mock, sessions and protected routes, profile and settings, and roles.

## AUTH-1 Sign up and sign in

Story: As a visitor, I create an account with an email address and sign in later with the same account.
Depends on: FND-3
Evidence: arch:sign-in, journey:sign-up

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| AUTH-1.AC1 | Given a visitor on the sign-in page, when they submit a valid email and password, then an account is created and they land on settings. | tests/acceptance/auth/sign-up.spec.ts |
| AUTH-1.AC2 | Given the OAuth adapter in development mode, when the visitor picks the Harbor ID provider, then the mock completes sign-in without a network call. | tests/acceptance/auth/oauth-mock.spec.ts |
| AUTH-1.AC3 | Given an existing account, when the visitor signs in with a wrong password, then the form shows one generic error and no account detail. | tests/acceptance/auth/sign-in-errors.spec.ts |

## AUTH-2 Sessions and protected routes

Story: As a member, I stay signed in across visits, and a protected page sends me to sign-in when I am signed out.
Depends on: AUTH-1
Evidence: arch:account-settings

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| AUTH-2.AC1 | Given a valid session cookie, when the member opens a protected route, then the page renders without a redirect. | tests/acceptance/auth/protected-routes.spec.ts |
| AUTH-2.AC2 | Given no session, when a visitor opens a protected route, then they are sent to sign-in and returned to the original path after sign-in. | tests/acceptance/auth/redirect-return.spec.ts |
| AUTH-2.AC3 | Given a sign-out, when the session is revoked, then the old cookie no longer opens protected routes. | tests/acceptance/auth/sign-out.spec.ts |

## AUTH-3 Profile and settings

Story: As a member, I change my display name and email address from one settings page.
Depends on: AUTH-1
Evidence: arch:account-settings

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| AUTH-3.AC1 | Given a signed-in member, when they save a new display name, then the name appears in the header and on their posts. | tests/acceptance/auth/profile-save.spec.ts |
| AUTH-3.AC2 | Given an invalid email address, when the member saves settings, then the field shows an inline error and nothing is saved. | tests/acceptance/auth/settings-validation.spec.ts |
| AUTH-3.AC3 | Given the settings form, when a keyboard user tabs through it, then every control has a label and every error is announced. | axe:settings-form |

## AUTH-4 Roles (member, admin)

Story: As an admin, I open admin pages that members cannot open.
Depends on: AUTH-2
Evidence: arch:admin-models

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| AUTH-4.AC1 | Given a member, when they request an admin route, then the server responds 403 and sends no admin data. | tests/acceptance/auth/roles-admin.spec.ts |
| AUTH-4.AC2 | Given an admin, when they open an admin route, then the page renders with the admin navigation. | tests/acceptance/auth/roles-admin-ui.spec.ts |
| AUTH-4.AC3 | Given a role change in the database, when the user's next request arrives, then the new role applies without a sign-out. | tests/acceptance/auth/role-refresh.spec.ts |
