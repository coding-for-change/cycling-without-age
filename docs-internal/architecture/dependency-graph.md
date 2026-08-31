# Dependency graph

Which Use Cases call which Facades. Update this whenever a feature or use case is added.

```mermaid
graph TD
  subgraph Presentation
    A[src/app]
  end
  subgraph Boundary
    G[lib/auth-guards]
    ACT1[features/membership/actions]
    ACT2["app/(flow)/location/actions"]
    ACT3["app/(flow)/onboarding/actions"]
    ACT4["app/join/[[...slug]]/route"]
  end
  subgraph Orchestration
    U1[use-cases/build-session-access]
    U2[use-cases/onboarding-progress]
    U3[use-cases/settle-passenger-location]
    U4[use-cases/accept-onboarding-consent]
    U5[use-cases/complete-onboarding-profile]
  end
  subgraph Features
    F1[features/chapters facade]
    F2[features/membership facade]
    F3[features/profile facade]
    F4[features/passengers facade]
  end
  subgraph Data
    S1[chapters/services]
    S2[membership/services]
    S3[profile/services]
    S4[passengers/services]
    DB[(MySQL via lib/prisma)]
  end
  subgraph Infrastructure
    MB[lib/mapbox]
    ML[lib/mailer]
    COOKIE[(guest chapter + join preset cookies)]
  end

  A --> G
  A --> F1
  A --> U2
  G --> F1
  AUTH[lib/auth customSession] --> U1

  A --> ACT1
  A --> ACT2
  A --> ACT3
  ACT1 --> F2
  ACT2 --> F1
  ACT2 --> U3
  ACT2 --> MB
  ACT2 --> COOKIE
  ACT3 --> F3
  ACT3 --> U2
  ACT3 --> U4
  ACT3 --> U5
  ACT3 --> COOKIE
  ACT4 --> F1
  ACT4 --> COOKIE

  U1 --> F1
  U1 --> F2
  U2 --> F1
  U2 --> F2
  U2 --> F3
  U3 --> F2
  U3 --> F3
  U4 --> F2
  U4 --> F3
  U5 --> F1
  U5 --> F2
  U5 --> F3
  U5 --> F4
  U5 --> ML

  F1 --> S1
  F2 --> S2
  F3 --> S3
  F4 --> S4
  S1 --> DB
  S2 --> DB
  S3 --> DB
  S4 --> DB
```

| Use case | Facades it coordinates | Why it exists |
| --- | --- | --- |
| `build-session-access` | `chapters`, `membership` | The session payload needs the user's country-admin scopes (chapters) *and* their chapter memberships (membership). Two facades → a use case. |
| `onboarding-progress` | `chapters`, `membership`, `profile` | How far someone got is spread across three tables: which chapter they joined, what they consented to, whether a rider profile exists. Read by the `/onboarding` resolver and by every step that draws the progress dots. |
| `settle-passenger-location` | `membership`, `profile` | "Where do you live" and "which chapter serves you" are one answer given on one screen, but two features own the two halves. |
| `accept-onboarding-consent` | `membership`, `profile` | Records consent and, when a QR preset skipped the location step, performs the join it would have done. |
| `complete-onboarding-profile` | `chapters`, `membership`, `passengers`, `profile` | Writes the account's own details, creates the rider profile a ride will point at, resolves the chapter, and sends the welcome mail. |

Single-facade work has no use case: `lib/auth-guards` calls `chapters.getChapterCountryId`
directly, `features/membership/actions` calls the membership facade directly, and the passkey
and pilot-next-steps actions call the profile facade directly.

`lib/mapbox` and `lib/mailer` are cross-cutting infrastructure, callable from any layer — the
same standing as `lib/prisma` and `lib/sms`. `lib/mapbox` is reached only from a Server Action
so the secret token never enters a client bundle.
