# E2E Tests for art-backend

This directory contains end-to-end tests that validate the art-backend API by making actual HTTP requests to a running server instance.

## Prerequisites

1. **Firebase Emulator**: The server must be configured to use the Firebase emulator
   - **Firestore**: Required for all tests
   - **Storage**: Required for upload-photo tests (image storage)
2. **Running Server**: The API server must be running on `http://localhost:3000`
3. **Valid API Key**: Tests use the API key from your `.env` file
4. **Sample Images**: `sample.jpeg` and `sample.png` must exist in `apps/art-backend/`

## Running E2E Tests

### Step 1: Start the Server

In one terminal, start the development server:

```bash
cd apps/art-backend
pnpm run dev
```

The server should start on port 3000 and you should see:
```
server-started: { port: 3000 }
```

### Step 2: Run the E2E Tests

In another terminal, run the e2e tests:

```bash
cd apps/art-backend
pnpm test test/e2e
```

Or run a specific test file:

```bash
pnpm test test/e2e/upload-photo.e2e.test.ts
pnpm test test/e2e/get-fish.e2e.test.ts
```

## Test Coverage

### POST /upload-photo (6 tests)
- ✅ Successfully upload a photo and return fish data
- ✅ Return 401 when API key is missing
- ✅ Return 401 when API key is invalid
- ✅ Return 400 when photo field is missing
- ✅ Return 400 when photo field is not a file
- ✅ Accept PNG images

### GET /get-fish (7 tests)
- ✅ Return array of fish (may be empty or populated)
- ✅ Return 401 when API key is missing
- ✅ Return 401 when API key is invalid
- ✅ Set Cache-Control header to no-store
- ✅ Validate response is valid JSON array
- ✅ Validate fish data structure matches OpenAPI schema
- ✅ Handle multiple concurrent requests

## Notes

- **Database State**: Tests interact with the actual Firebase emulator database. Fish data persists across test runs until the emulator is restarted or data is manually cleared.
- **No Mocking**: These are true e2e tests - they use the real application stack including Firebase emulator, image processing, and all middleware.
- **Test Isolation**: Tests do not modify or clean up data to allow inspection of results in the emulator.

## Troubleshooting

### "Connection refused" errors
- Ensure the server is running on port 3000
- Check that no other process is using port 3000
- Verify the server started successfully without errors

### Authentication errors
- Check that your `.env` file has a valid `API_KEY`
- The tests read the API key from your environment configuration

### Firebase errors
- Ensure the Firebase emulator is running if required
- Check `FIREBASE_PROJECT_ID` in `.env`
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid credentials

### "STORAGE_UPLOAD_FAILED" errors
- This indicates Firebase Storage emulator is not properly configured
- Ensure Firebase Storage emulator is running on the correct port
- Check that the server is configured to use the storage emulator (not production Firebase)
- Verify storage bucket name matches emulator configuration
- The upload-photo e2e tests require storage emulator to be fully functional
