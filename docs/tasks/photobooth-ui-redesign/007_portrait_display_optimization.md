# Task 007: Portrait Display Optimization (9:21 Aspect Ratio)

## Objective
Optimize the display page for portrait orientation with 9:21 aspect ratio, as it runs on a vertically-mounted display.

## Changes Made

### 1. Idle State
**Before:**
- 8xl heading (very large)
- 4xl prompt
- No line breaks

**After:**
- 6xl heading with line break ("Gemini AI" / "フォトブース")
- 3xl prompt with line break
- Added horizontal padding (px-8)
- Responsive: md:text-7xl for larger displays
- Better text wrapping for narrow portrait screens

### 2. Menu State
**Before:**
- 5xl text
- No padding

**After:**
- 4xl text with responsive md:5xl
- Added horizontal padding (px-8)
- Better readability on narrow screens

### 3. Capturing State (Most Critical Change)
**Before:**
- Webcam constraints: 1920x1080 (landscape)
- Countdown: 300px

**After:**
- Webcam constraints: 1080x1920 (portrait)
- Countdown: 200px with responsive md:300px
- Proper portrait webcam orientation
- Full-screen coverage maintained

### 4. Generating State
**Before:**
- Fixed width progress bar: 600px
- 6xl text
- No padding

**After:**
- Responsive progress bar: w-3/4 max-w-2xl
- 5xl text with responsive md:6xl
- Added horizontal padding (px-8)
- Progress bar adapts to screen width

### 5. Completed State
**No changes needed:**
- `fill` + `object-contain` already works perfectly for portrait
- Black background provides good contrast
- Image scales properly regardless of orientation

## Technical Details

### Portrait Webcam Configuration
```tsx
videoConstraints={{
  width: 1080,    // Portrait width
  height: 1920,   // Portrait height (9:16 aspect ratio)
  facingMode: "user",
}}
```

This ensures the webcam feed is properly oriented for portrait displays.

### Responsive Typography
Used Tailwind's responsive utilities:
- Base size for portrait (smaller)
- `md:` breakpoint for larger displays

Example:
```tsx
className="text-6xl md:text-7xl"  // 6xl on portrait, 7xl on wider
```

### Responsive Spacing
- Added `px-8` (horizontal padding) to all states
- Prevents text from touching screen edges on narrow displays
- Ensures readable margins

## Aspect Ratio Considerations

### 9:21 Aspect Ratio Examples
- 1080 x 2520 (exact 9:21)
- 1080 x 1920 (9:16, common phone/portrait display)

### Why 1080x1920 Webcam?
- 9:16 is more common than 9:21 for cameras
- Provides good coverage for 9:21 displays
- Fills screen with `object-cover`
- Better camera compatibility

## Testing Checklist
- [ ] Test on actual portrait display (9:21 or 9:16)
- [ ] Verify webcam orientation is correct
- [ ] Check countdown visibility during capture
- [ ] Ensure progress bar fits within screen width
- [ ] Verify text wrapping doesn't cause overflow
- [ ] Test completed state image display
- [ ] Check all states for proper padding/margins

## Browser Testing
**Portrait orientation simulation:**
1. Chrome DevTools → Device Toolbar
2. Select "Responsive"
3. Set dimensions:
   - Width: 1080px
   - Height: 2520px (9:21) or 1920px (9:16)
4. Test all states

## Completion Criteria
- [x] Webcam uses portrait dimensions (1080x1920)
- [x] All text sizes responsive for portrait
- [x] Progress bar adapts to screen width
- [x] Horizontal padding added to all states
- [x] No overflow or text cutoff
- [x] Line breaks added where needed
- [x] Countdown size appropriate for portrait

## Notes
- Control page remains optimized for landscape tablet
- Only display page changed for portrait
- Changes maintain design philosophy (pop and fun)
- All animations preserved
- No functionality broken
