# Data Model — Stamp Rally Guest Experience

## Firestore
```
users/{userId}               # userId = Firebase Auth UID (anonymous)
  stamps: {                  # Timestamps for each stamp acquisition
    reception?: Timestamp
    photobooth?: Timestamp
    art?: Timestamp
    robot?: Timestamp
    survey?: Timestamp
  }
  lastSignedInAt: Timestamp   # Updated whenever the guest re-authenticates
  giftReceivedAt?: Timestamp  # Set when staff confirm prize redemption
  createdAt: Timestamp        # First time the attendee authenticated
```

### Notes
- Stamp keys map one-to-one with NFC checkpoints plus the survey completion.
- Absence of a key indicates the stamp has not been earned yet.
- `giftReceivedAt` is optional and only written by staff-authorized clients after scanning the guest QR.
- Security rules ensure each user can only mutate their own document except for staff IDs that set `giftReceivedAt`.

## Firebase Remote Config
```
stamp_app_status: "online" | "degraded" | "maintenance"
stamp_app_message_ja: string
stamp_app_message_en: string
```

### Notes
- `stamp_app_status` steers guest routing (e.g., redirect to `/maintenance` when not "online").
- Localized messages display across guest surfaces whenever status is not "online".
