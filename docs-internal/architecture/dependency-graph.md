# Dependency graph

Which Use Cases call which Facades. Update this whenever a feature or use case is added.

```mermaid
graph TD
  subgraph Presentation
    A[src/app]
  end
  subgraph Boundary
    G[lib/auth-guards]
  end
  subgraph Orchestration
    U1[use-cases/build-session-access]
  end
  subgraph Features
    F1[features/chapters facade]
    F2[features/membership facade]
  end
  subgraph Data
    S1[chapters/services]
    S2[membership/services]
    DB[(MySQL via lib/prisma)]
  end

  A --> G
  A --> F1
  A --> F2
  G --> F1
  AUTH[lib/auth customSession] --> U1
  U1 --> F1
  U1 --> F2
  F1 --> S1
  F2 --> S2
  S1 --> DB
  S2 --> DB
```

| Use case | Facades it coordinates | Why it exists |
| --- | --- | --- |
| `build-session-access` | `chapters`, `membership` | The session payload needs the user's country-admin scopes (chapters) *and* their chapter memberships (membership). Two facades → a use case. |

Single-facade work has no use case: `lib/auth-guards` calls `chapters.getChapterCountryId`
directly, and future Server Actions call one facade directly.
