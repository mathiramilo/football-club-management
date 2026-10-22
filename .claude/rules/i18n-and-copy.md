---
paths:
  - "packages/i18n/**"
  - "apps/web/**/*.tsx"
  - "apps/mobile/**/*.tsx"
  - "apps/api/src/modules/notifications/**"
---

# i18n and copy

Specs: `docs/product/03-glossary.md`, `docs/ux/01-information-architecture-and-flows.md` § 6 (voice and tone), NFR-I18N-01–04.

## Catalogs

- Every user-facing string (UI, push, email, error messages) lives in `packages/i18n` as **ICU MessageFormat**, with plural and gender support. No hard-coded copy anywhere.
- Spanish (`es`, Río de la Plata) is the source locale. English arrives in R3 (AUTH-14); don't add `en` strings before then unless asked.
- Keys are dot-separated by area: `events.rsvp.going`, `wellness.checkin.loadQuestion`, `errors.RSVP_LOCKED`, `notifications.N-03.push.body`.
- Interpolate values with ICU placeholders. Never build sentences by concatenating strings.
- Format dates, times and numbers with the i18n library in the club time zone, 24-hour format, weeks starting Monday.

## Voice and tone (es)

- *Voseo* always: "Confirmá", "¿Vas?", "Invitá", never "Confirma" or "Confirme".
- Calls to action: imperative, ≤ 3 words ("Confirmá", "Pasar lista", "Compartir").
- RSVP uses the players' words: "Voy", "No voy", "Llego tarde".
- Confirmations are short and warm: "¡Listo! Te esperamos el martes."
- Warnings state the fact and the fix: "Sin arquero confirmado. Invitá a un arquero de otra categoría."
- Errors say what happened and what to do, with no blame and no codes: "No pudimos guardar tu respuesta. Lo intentamos de nuevo cuando vuelva la conexión."
- Health-related copy is calm and non-alarming, and mentions professional advice for severe pain: "Si el dolor es fuerte o no mejora, consultá a un médico o fisio."
- Empty states explain the value and the next step.
- Use the glossary's Spanish labels (Actividad, Práctica, Partido, Categoría, Pasar lista, Hora de citación…). Avoid English loanwords where a common Spanish word exists ("práctica", not "training").
- Inclusive forms as in the glossary ("Jugador/a", "Invitado/a") where the person's gender is unknown.

If the spec doesn't give the copy for a new string, propose it and flag it as a proposal in the PR for product review (Definition of Ready requires copy).

## Push and email

- Push text never contains health data, absence reasons or notes, and is localized per recipient at send time (BR-NOTIF-08).
- Email templates are React Email components reading the same catalogs.
