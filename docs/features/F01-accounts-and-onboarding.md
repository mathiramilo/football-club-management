# F01 — Accounts, Sign-in & Onboarding

> Status: **Draft v0.1** · Release: **R1** · Owner: Product · Last updated: 2026-10-23
> Related: [Roles](../product/02-personas-and-roles.md) · [F02 Clubs & membership](F02-clubs-categories-and-membership.md) · [Privacy](../product/06-privacy-and-compliance.md) · OQ-05, OQ-06, OQ-07, OQ-08

## 1. Goal

Get a player from a WhatsApp link to a confirmed RSVP in **under 60 seconds** the first time, and in **one tap** after that. Give every person **one account** that works across clubs, categories and roles.

This feature is not in the Notion brief. It is a prerequisite for every other feature.

## 2. Scope

| In (R1) | Later |
|---|---|
| Sign in with Google, Apple and email one-time code | Phone or WhatsApp OTP (OQ-06) |
| Terms and privacy acceptance (versioned) | Guardian-managed accounts for under-16 players (OQ-05) |
| Personal profile and club-specific player profile | Merging two accounts of the same person |
| Joining through invite links and club codes, with optional approval | Deferred deep linking (resume the invite after installing the app) |
| Claiming a managed (account-less) profile | Self-service data export (handled manually by support in R1) |
| Club switcher | |
| Sign out, session management, account deletion | |

## 3. Business rules

| ID | Rule |
|---|---|
| BR-AUTH-01 | An account is identified by a **verified email**. Signing in with Google or Apple using a verified email that already belongs to an account signs into that account. Unverified provider emails are never auto-linked. |
| BR-AUTH-02 | Apple "Hide My Email" relay addresses are accepted. They create separate accounts unless the user signs in with the same Apple ID again. |
| BR-AUTH-03 | Email one-time codes: 6 digits, valid 10 minutes, single use, at most 5 attempts per code, resend allowed after 60 s, and rate limited per email and per IP (see [NFR](../tech/05-non-functional-requirements.md)). |
| BR-AUTH-04 | Sessions are kept on the server and expire after 90 days without use, on every device (D-17, ADR-007). A user can sign out of all devices. |
| BR-AUTH-05 | **Minimum age is 16** (OQ-05). Birthdate is required. Under 16, sign-up is blocked with a friendly explanation. Users aged 16–17 are flagged as **minors**: wellness check-ins stay disabled until a guardian consents ([F07](F07-player-wellness.md)). |
| BR-AUTH-06 | Required personal fields: first name, last name, birthdate. Optional: nickname (*apodo*), photo, phone number. |
| BR-AUTH-07 | **Display name**: the nickname if set, otherwise first name plus last-name initial ("Nicolás P."). Staff always see full names as well. |
| BR-AUTH-08 | Terms of service and privacy policy are versioned. A material change requires re-acceptance at the next app open, before anything else can be done. Acceptance (version and timestamp) is stored. |
| BR-AUTH-09 | Opening an invite link resolves club, category and role **before** sign-in, so the user knows what they are joining. After sign-in: if the user is already in that category, the category opens; if the link requires approval, a join request is created; otherwise the user joins immediately. |
| BR-AUTH-10 | Invite links expire after 30 days by default (configurable 1–90 days), can be revoked at any time, and can have an optional maximum number of uses. Exception: each category's default player link never expires and has no use limit (CLUB-05). Expired or revoked links show a clear message and a "pedile un link nuevo a tu DT" hint. |
| BR-AUTH-11 | **Claim links** are personal, single-use and expire after 14 days. Claiming attaches the managed profile to the account. If the user already belongs to the club, the two memberships are **merged** into the account's membership: <br>• **Categories**: where both have an open membership in the same category, one remains, with the earlier `starts_on`, the account's staff role (or the profile's if the account has none) and `is_player` set if either has it. Other category memberships move over unchanged. <br>• **Events**: where only one of them has an invitee row, it moves over. Where both do, one row remains: its RSVP is the most recent response (by `responded_at`), its attendance is the most recently recorded value, and the RSVP history of both rows is kept on it. <br>• **Profile**: staff-entered positions and jersey number are kept unless the user already set theirs. <br>Staff-initiated merges (BR-CLUB-10) follow the same rule. Every merge is recorded in the audit log. |
| BR-AUTH-12 | **Account deletion**: the account is deactivated immediately and permanently deleted after 30 days. Signing in during that period cancels the deletion. On permanent deletion, personal profile, wellness data and AI conversations are deleted. Consent records are kept as legal evidence for 5 years after revocation, reduced to type, version, dates and grantor (self or guardian) ([Privacy § 6](../product/06-privacy-and-compliance.md#6-retention)); RSVP and attendance records are **anonymized** ("Ex-jugador/a") so team statistics stay correct. An Owner must transfer ownership or delete the club first (BR-ROLE-05). |
| BR-AUTH-13 | Push-notification permission is **not** requested at first launch. It is requested after the first meaningful action (first RSVP or first check-in), using an explanation screen first ([F10](F10-notifications.md)). |

## 4. User stories

### AUTH-01 · Sign in with Google
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a user, I want to sign in with my Google account so that I don't have to create or remember a password.

**Acceptance criteria**
- Given I am on the sign-in screen, when I choose "Continuar con Google" and complete the Google flow, then I am signed in. A new account is created if my verified email is unknown.
- Given my Google email matches an existing account (BR-AUTH-01), then I sign into that account; no duplicate is created.
- Given the web page is opened in an embedded in-app browser that blocks Google sign-in, then the Google option is replaced by "Abrí en tu navegador" plus the email-code option (see [NFR-COMP-04](../tech/05-non-functional-requirements.md)).

### AUTH-02 · Sign in with Apple
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile (iOS), Web

As an iPhone user, I want to sign in with Apple so that I can join with one tap and optionally hide my email.

**Acceptance criteria**
- Given I am on iOS, then "Continuar con Apple" appears on the sign-in screen, as App Store guidelines require for apps offering third-party sign-in.
- Given I choose to hide my email, then the account uses the relay address and works normally (BR-AUTH-02).
- Given Apple only provides my name on the first sign-in, then that name pre-fills profile completion (AUTH-05).

### AUTH-03 · Sign in with an email code
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a user without (or not wanting to use) Google or Apple, I want to receive a code by email so that I can sign in from any device or browser.

**Acceptance criteria**
- When I enter my email and request a code, then I receive a 6-digit code within 1 minute (p95), and the screen offers "abrir mi correo".
- When I enter a valid code, then I am signed in; codes follow BR-AUTH-03.
- When I enter an invalid or expired code, then I see a specific error ("código incorrecto" vs. "el código venció") and can request a new code after 60 s.

### AUTH-04 · Accept terms and privacy policy
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Web

As the platform, we need every user to accept the current terms and privacy policy so that we have a valid legal basis to process their data.

**Acceptance criteria**
- Given I have not accepted the current versions, then I cannot use the product until I accept them; the documents are readable in-app.
- Acceptance is stored with document version, timestamp and app/platform (BR-AUTH-08).

### AUTH-05 · Complete my personal profile
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a new user, I want a short profile setup so that my coach and teammates recognize me.

**Acceptance criteria**
- The form asks for first name, last name, birthdate (required) and nickname and photo (optional). It can be completed in under 30 seconds.
- Given my birthdate makes me younger than 16, then I cannot continue and see an explanation (BR-AUTH-05).
- Given I am 16–17, then my account is flagged as a minor and I am told my guardian will need to approve the wellness check-ins.
- Photos are cropped to a square, compressed on the device (≤ 300 KB) and can be removed later.

### AUTH-06 · Join my team through an invite link
**Release:** R1 · **Priority:** Must · **Size:** L · **Platforms:** Mobile, Web

As a player, I want to open the link my DT shared in the WhatsApp group and join my category so that I start receiving events.

**Acceptance criteria**
- Given the app is installed, when I tap the link, then the app opens on the invite screen (universal links on iOS, app links on Android). Otherwise the web app opens the same screen.
- The invite screen shows the club crest, club name, category and role ("Te invitan a **Primera** de **Club Atlético X** como jugador/a") before asking me to sign in (BR-AUTH-09).
- After sign-in and profile completion, if approval is required (OQ-08) I see a "pending approval" state (AUTH-08); otherwise I land on the category home with my upcoming events.
- Given the link is expired, revoked or over its usage limit, then I see a clear message (BR-AUTH-10).
- Given I am already a member of that category, then I go straight to it.
- On web, after joining, I see a prompt to install the app ("para recibir recordatorios") with store badges. Skipping it still lets me use the web.

### AUTH-07 · Join with a club code
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Web

As a player whose link didn't work (or who was told the code in person), I want to type a short code so that I can still join.

**Acceptance criteria**
- Every invite link has an equivalent 6-character code (unambiguous characters only, e.g. no `0/O`, `1/I`).
- Entering the code under "Unirme a un equipo" behaves exactly like opening the link.

### AUTH-08 · Pending approval state
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Web

As a player waiting for approval, I want to see that my request is pending so that I know I did everything right.

**Acceptance criteria**
- The home screen shows "Tu solicitud para unirte a Primera está pendiente", with the date requested and an option to cancel.
- When staff approve, I get notification N-10 and the category appears with its upcoming events.
- When staff reject, I see "Tu solicitud no fue aceptada", with no reason shown; the request is removed after 7 days.

### AUTH-09 · Claim my managed profile
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player my DT already added to the roster, I want to claim my profile so that my attendance history follows me.

**Acceptance criteria**
- Staff share a personal claim link from the player's profile ("Enviar link para que se una"), via the share sheet or by copying the link.
- When I open it and sign in, I see "Vas a vincular tu cuenta con el perfil **Nicolás Pérez** en **Primera**". After I confirm, the profile is merged per BR-AUTH-11.
- After claiming, the managed-profile badge disappears for staff, and RSVPs previously set by staff stay as recorded (still marked "Confirmado por el cuerpo técnico").
- A claim link cannot be used twice or after 14 days.

### AUTH-10 · Set my player details in a club
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Web

As a player, I want to set my position(s) and jersey number for my club so that the squad view shows me in the right line.

**Acceptance criteria**
- I can pick one primary position and up to two secondary positions from the list in the [Glossary § 3](../product/03-glossary.md#3-positions), plus an optional jersey number (1–99) and dominant foot.
- The data belongs to my club membership: a different club can hold different values.
- Staff (DT, Coach, Admin) can also edit these fields; the last edit wins and the audit log records who made it.
- Jersey number uniqueness is **not** enforced (amateur clubs reuse numbers across categories); a soft warning is shown if two players in the same category share a number.

### AUTH-11 · Switch between clubs
**Release:** R1 · **Priority:** Should · **Size:** M · **Platforms:** Mobile, Web

As someone who belongs to more than one club, I want to switch clubs, and see my upcoming events from all of them together, so that I never miss anything.

**Acceptance criteria**
- The header shows the current club's crest. Tapping it lists all my clubs with pending-action badges (RSVPs, check-ins).
- The player agenda ("Mis actividades") shows events from all my clubs by default, each tagged with its club crest; it can be filtered to one club.
- Staff screens (dashboards, library, planning) always work in the context of one selected club.

### AUTH-12 · Sign out and manage sessions
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Web

As a user, I want to sign out of this device or of all devices so that I stay in control if I lose my phone.

**Acceptance criteria**
- "Cerrar sesión" signs out the current device and unregisters its push token.
- "Cerrar sesión en todos los dispositivos" revokes all sessions; other devices are signed out on their next API call.

### AUTH-13 · Delete my account
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a user, I want to delete my account from inside the app so that my personal data is removed (an App Store and Google Play requirement).

**Acceptance criteria**
- Settings → "Eliminar cuenta" explains what is deleted and what is anonymized (BR-AUTH-12) and asks for confirmation with an email code.
- Given I am the Owner of a club, then I am asked to transfer ownership or delete the club first.
- After confirming, I am signed out everywhere and receive a confirmation email that states the permanent-deletion date.
- A public web page explains how to request deletion without the app (Google Play requirement).

### AUTH-14 · Choose my language
**Release:** R3 · **Priority:** Could · **Size:** S · **Platforms:** Mobile, Web

As a user, I want to use the app in English or Spanish so that I can understand it.

**Acceptance criteria**
- The default is the device language when supported, otherwise Spanish (OQ-02).
- Changing the language updates the UI, notifications and emails for that user.
- Strings are externalized from R0 onwards, so this story only adds the English translations and the selector.

## 5. Edge cases

| Case | Expected behavior |
|---|---|
| Invite link opened inside an in-app browser that blocks Google sign-in | Show email-code sign-in and an "Abrir en el navegador" hint (AUTH-01). |
| User installs the app after opening an invite on the web | After signing in on the app, any pending join request or membership is already tied to the account, so nothing is lost. Deferred deep linking is Later. |
| Same person signs up with Apple relay email and with Google | Two accounts. Support can merge manually (Later: self-service merge). |
| Staff created a managed profile, and the player joins through the generic category link instead of the claim link | The approval screen, or the "Posible duplicado" item when the link needs no approval (BR-CLUB-10), warns "Posible duplicado de **Nicolás Pérez** (perfil sin cuenta)" with a **Merge** action that applies BR-AUTH-11. |
| User turns 18 | The minor flag is cleared automatically. Guardian consent stays on record; the player is asked to confirm consent themselves at the next check-in. |
| User changes birthdate to bypass the age gate | Birthdate can only be changed by support after the first save. |

## 6. Telemetry

`sign_in_started {method}`, `sign_in_completed {method, new_account}`, `profile_completed {is_minor}`, `invite_link_opened {app_installed, platform, link_status}`, `join_request_created`, `join_completed {via: link|code|claim}`, `managed_profile_claimed`, `club_switched`, `account_deletion_requested`.

## 7. Open questions

- **OQ-05** Minimum age and handling of minors (legal validation).
- **OQ-06** Should phone or WhatsApp OTP be offered at launch?
- **OQ-07** Do we ever allow an RSVP without an account? (Recommendation: no; managed profiles plus proxy RSVP cover players who never install the app.)
- **OQ-08** Approval required by default for join links?
