# Data Model — Stamp Rally Web Experience

## AttendeeProfile
| Field | Type | Source | Validation | Notes |
|-------|------|--------|------------|-------|
| `uid` | string | Firebase Auth (anonymous) | Required, immutable | Document id |
| `displayLanguage` | enum (`"ja"`, `"en"`) | Derived from browser or toggle | Required | Drives bilingual copy |
| `stamps` | map<string, boolean> | Firestore | Must include keys for all configured stamp IDs | `true` when awarded |
| `completedAt` | timestamp | Firestore server time | Optional | Set when all stamps collected |
| `surveyCompleted` | boolean | Survey proxy route | Defaults `false`; set `true` after Google Form success |
| `rewardQr` | object | Server action | Contains `dataUrl` and `generatedAt` |
| `rewardEligible` | boolean | Derived | `true` when all stamps + survey completed |
| `rewardRedeemed` | boolean | Admin scan flow | Set `true` after successful redemption |
| `rewardRedeemedAt` | timestamp | Admin scan flow | Optional | |
| `maintenanceBypass` | boolean | Remote Config | Optional flag for staff test accounts |

### State Transitions
1. `rewardEligible` flips to `true` when every `stamps[key] === true` and `surveyCompleted === true`.
2. `rewardRedeemed` toggles to `true` only after admin confirmation, locking further QR regeneration.
3. Maintenance mode forces read-only views unless `maintenanceBypass` is `true`.

## StampEvent
| Field | Type | Source | Validation | Notes |
|-------|------|--------|------------|-------|
| `uid` | string | Link to attendee | Required |
| `stampId` | string | NFC token lookup | Required, must match configured id |
| `awardedAt` | timestamp | Firestore server time | Required |
| `source` | enum (`"reception"`, `"photobooth"`, `"interactive"`, `"robot"`, `"survey"`) | Server validation | Required |
| `status` | enum (`"granted"`, `"duplicate"`, `"invalid"`) | Award logic | Required |
| `maintenanceLevel` | enum (`"normal"`, `"degraded"`) | Remote Config snapshot | Required |

Relationship: `attendees/{uid}/stampEvents/{eventId}`

## RewardRedemption
| Field | Type | Source | Validation | Notes |
|-------|------|--------|------------|-------|
| `uid` | string | AttendeeProfile | Required |
| `redeemedAt` | timestamp | Firestore server time | Required |
| `staffId` | string | Admin auth UID | Required |
| `result` | enum (`"success"`, `"duplicate"`, `"invalid"`) | Scan handler | Required |
| `qrPayloadHash` | string | Hash of QR contents | Required for audit |

Collection: `rewardRedemptions/{autoId}`

## SurveySubmissionRef
| Field | Type | Source | Validation | Notes |
|-------|------|--------|------------|-------|
| `uid` | string | AttendeeProfile | Required |
| `submittedAt` | timestamp | Proxy route | Required |
| `googleResponseId` | string | Google Form response | Optional (if available from response) |
| `status` | enum (`"success"`, `"error"`) | Proxy route | Required |
| `errorMessage` | string | Proxy route | Present only when status = `"error"` |

Collection: `surveySubmissions/{autoId}`

## MaintenanceNotice (Remote Config)
| Parameter | Type | Validation | Notes |
|-----------|------|------------|-------|
| `stamp_app_status` | enum (`"online"`, `"degraded"`, `"maintenance"`) | Required |
| `stamp_app_message_ja` | string | <= 140 chars | Displayed to attendees (JA) |
| `stamp_app_message_en` | string | <= 140 chars | Displayed to attendees (EN) |
| `maintenance_whitelist` | array<string> | Optional | UIDs allowed through |

## Derived Views
- **Progress Summary**: Aggregates `stamps` map into counts and call-to-action for UI.
- **Eligibility Check**: Server action verifying all stamps, `surveyCompleted`, and `rewardRedeemed === false`.

## Data Access Rules
- Attendees may read/write only their own profile and nested collections.
- Admin accounts can read attendee profiles, stamp events, and create redemption records.
- Survey submissions are append-only; only service account can read for analytics.
