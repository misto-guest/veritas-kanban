# Enforcement Gates

Veritas Kanban includes optional enforcement gates that can harden your workflow by
blocking task transitions or automating run/telemetry behavior. All enforcement
gates are **disabled by default** and must be explicitly enabled via the Settings API.

## Available Gates

| Gate               | Behavior                                                                      | Default |
| ------------------ | ----------------------------------------------------------------------------- | ------- |
| `reviewGate`       | Blocks completion unless all four `reviewScores` are `10` (4x10 review gate). | `false` |
| `closingComments`  | Blocks completion unless at least one review comment has ≥20 characters.      | `false` |
| `autoTelemetry`    | Auto-emits `run.started`/`run.completed` on status changes.                   | `false` |
| `autoTimeTracking` | Auto-starts/stops task timers when status changes.                            | `false` |

## Enable/Disable Gates

Feature settings live under `/api/settings/features`. Use `PATCH` to enable or disable
enforcement gates.

### Fetch current settings

```bash
curl http://localhost:3001/api/settings/features | jq
```

### Enable review gate + closing comments

```bash
curl -X PATCH http://localhost:3001/api/settings/features \
  -H 'Content-Type: application/json' \
  -d '{
    "enforcement": {
      "reviewGate": true,
      "closingComments": true
    }
  }'
```

### Enable automation gates

```bash
curl -X PATCH http://localhost:3001/api/settings/features \
  -H 'Content-Type: application/json' \
  -d '{
    "enforcement": {
      "autoTelemetry": true,
      "autoTimeTracking": true
    }
  }'
```

### Disable all enforcement gates

```bash
curl -X PATCH http://localhost:3001/api/settings/features \
  -H 'Content-Type: application/json' \
  -d '{
    "enforcement": {
      "reviewGate": false,
      "closingComments": false,
      "autoTelemetry": false,
      "autoTimeTracking": false
    }
  }'
```

> Note: If the `enforcement` object is missing entirely, all enforcement behavior is skipped.
