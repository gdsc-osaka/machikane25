# Task 006: Testing

## Objective
Thoroughly test the redesigned photobooth UI to ensure all functionality works correctly and the user experience is smooth.

## Testing Categories

### 1. State Transition Testing

**Test all state transitions:**

| From State | Action | Expected To State |
|------------|--------|-------------------|
| idle | Tap screen | menu |
| menu | Click "写真を撮る" | capturing |
| capturing | After countdown | menu |
| menu | Click "決定" | generating |
| generating | Generation completes | completed |
| completed | Auto timeout or manual | idle |
| Any state | Click back button | idle |

**Test procedure:**
```bash
cd apps/photo
pnpm dev
```

1. Open control page: `http://localhost:3000/control/test-booth-001`
2. Open display page: `http://localhost:3000/display/test-booth-001`
3. Go through all transitions
4. Verify both pages sync correctly

**Checklist:**
- [ ] All transitions work on control page
- [ ] All transitions work on display page
- [ ] Pages stay synchronized
- [ ] No race conditions or state conflicts

### 2. UI Component Testing

**Control Page:**
- [ ] Idle state displays welcome message
- [ ] Tap anywhere starts session
- [ ] Menu shows uploaded images list
- [ ] Can select image (blue border appears)
- [ ] Generation options display correctly
- [ ] Can select one option per typeId
- [ ] Selected options thumbnails display
- [ ] "写真を撮る" button works
- [ ] "決定" button disabled when requirements not met
- [ ] "決定" button enabled when ready
- [ ] Countdown displays correctly
- [ ] Progress bar shows during generation
- [ ] QR code displays on completion
- [ ] Back button appears in all states (except idle)
- [ ] Back button returns to idle

**Display Page:**
- [ ] Idle state displays welcome message
- [ ] Menu shows instructions
- [ ] Webcam feed displays during capturing
- [ ] Countdown overlays webcam
- [ ] Progress bar shows during generation
- [ ] Generated image displays full-screen
- [ ] All text is readable on large display

### 3. Scroll Prevention Testing

**Both pages:**
- [ ] No vertical scrolling possible
- [ ] No horizontal scrolling possible (except internal scroll areas)
- [ ] Touch/swipe gestures don't scroll page
- [ ] All content fits in viewport
- [ ] No scroll bars appear

**Internal scroll areas (control page menu):**
- [ ] Image list scrolls horizontally
- [ ] Page doesn't scroll when scrolling internal areas

### 4. Responsive Layout Testing

**Screen sizes to test:**
```
Control Page (Tablet):
- 768x1024 (iPad Portrait)
- 1024x768 (iPad Landscape)
- 800x1280 (Android Tablet Portrait)

Display Page (Large Display):
- 1920x1080 (Full HD)
- 1280x720 (HD)
- 3840x2160 (4K, if available)
```

**Checklist:**
- [ ] Control page layout works in portrait
- [ ] Control page layout works in landscape
- [ ] Display page optimized for large screens
- [ ] Text is readable at all sizes
- [ ] Buttons are touch-friendly (min 44x44px)
- [ ] QR code is scannable
- [ ] Webcam feed displays properly

### 5. Functional Testing

**Photo Capture:**
- [ ] Webcam permissions requested
- [ ] Webcam feed displays correctly
- [ ] Countdown works (5-4-3-2-1)
- [ ] Photo captures on countdown=0
- [ ] Photo uploads to Firestore
- [ ] Photo appears in menu state
- [ ] Can select captured photo

**Generation:**
- [ ] Can select photo
- [ ] Can select all required options
- [ ] Button disabled until all requirements met
- [ ] Generation starts when "決定" clicked
- [ ] Progress bar displays
- [ ] Generated image appears in completed state
- [ ] QR code links to correct download page

**QR Code:**
- [ ] QR code generates correctly
- [ ] QR code is scannable
- [ ] QR code links to correct URL
- [ ] Download page opens correctly

### 6. Error Handling Testing

**Test error scenarios:**
- [ ] Webcam permission denied
- [ ] Firestore connection lost
- [ ] Image upload fails
- [ ] Generation API fails
- [ ] Invalid booth ID
- [ ] Network disconnected

**Expected behavior:**
- [ ] Error messages display appropriately
- [ ] User can recover from errors
- [ ] No crashes or infinite loops

### 7. Performance Testing

**Metrics to check:**
- [ ] Page loads quickly (<3 seconds)
- [ ] State transitions are smooth (<500ms)
- [ ] Animations don't lag
- [ ] Webcam feed is real-time (no delay)
- [ ] Image loading is optimized
- [ ] No memory leaks during extended use

### 8. Integration Testing

**Test with real Firebase:**
```bash
# Using Firebase Emulator
pnpm test:photo:boothSessionFlow
```

**Manual integration test:**
1. Set up real Firestore connection
2. Create test booth
3. Upload real photos
4. Generate real images
5. Verify download page works

**Checklist:**
- [ ] Works with Firebase Emulator
- [ ] Works with production Firebase
- [ ] All data persists correctly
- [ ] Real-time sync works

### 9. Accessibility Testing

**Basic accessibility checks:**
- [ ] Can navigate with keyboard (tab order)
- [ ] Buttons have proper focus states
- [ ] Text contrast meets WCAG standards
- [ ] Images have alt text
- [ ] Touch targets are large enough (44x44px min)

### 10. Cross-Browser Testing

**Browsers to test:**
- [ ] Chrome (primary)
- [ ] Safari (iOS tablets)
- [ ] Firefox
- [ ] Edge

## Test Execution

### Automated Tests
```bash
cd apps/photo
pnpm test:photo:boothSessionFlow
pnpm test:photo:generateImage
```

### Manual Test Session
1. Start dev server: `pnpm dev`
2. Open both pages side-by-side
3. Go through complete user flow
4. Test edge cases
5. Test error scenarios
6. Document any issues

## Bug Report Template

```markdown
### Bug: [Short Description]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Screenshots/Video:**

**Environment:**
- Browser:
- Screen Size:
- Device:

**Severity:** [Critical/High/Medium/Low]
```

## Completion Criteria
- [ ] All state transitions work correctly
- [ ] All UI components function as expected
- [ ] No scrolling on either page
- [ ] Responsive on all target screen sizes
- [ ] All functional requirements met
- [ ] Error handling is appropriate
- [ ] Performance is acceptable
- [ ] No critical or high-severity bugs
- [ ] Integration tests pass
- [ ] Manual testing completed and documented
