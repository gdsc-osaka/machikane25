# Task 005: Disable Scrolling

## Objective
Ensure both control and display pages have no scrolling, creating a fixed, fullscreen experience suitable for kiosk/booth mode.

## Implementation Strategy

### 1. Page-Level Styles

**Both pages should have:**
```tsx
<main className="h-screen w-full overflow-hidden">
  {/* content */}
</main>
```

### 2. Layout File Check

**Verify booth layout (`apps/photo/src/app/(booth)/layout.tsx`):**
```tsx
export default function BoothLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
    </div>
  );
}
```

### 3. Root Layout Check

**Verify no conflicting styles in root layout:**
- Check `apps/photo/src/app/layout.tsx`
- Ensure no `min-h-screen` causing overflow
- Ensure body doesn't have overflow: auto

### 4. Global CSS Check

**Check `apps/photo/src/app/globals.css`:**
```css
/* Add if needed */
html, body {
  height: 100%;
  overflow: hidden;
}
```

**Note:** Only add global styles if page-level styles are insufficient.

### 5. Internal Scroll Containers

**For scrollable sections within fixed layouts:**

Only specific sections should scroll (e.g., image list in menu state):
```tsx
<div className="overflow-x-auto overflow-y-hidden">
  {/* horizontal scroll content */}
</div>
```

**Key principle:**
- Page/main container: NO scroll (`overflow-hidden`)
- Internal sections: Controlled scroll where needed (`overflow-x-auto`, etc.)

### 6. Testing Scroll Behavior

**Test on various screen sizes:**
```bash
# Chrome DevTools Device Toolbar
# Test dimensions:
# - Tablet: 1024x768, 800x1280
# - Desktop/Display: 1920x1080
```

**Check:**
- No vertical scroll bar appears
- No horizontal scroll bar appears (unless intended for internal sections)
- Content fits within viewport
- Touch scrolling doesn't work on body/main

### 7. Prevent Touch Scroll Gestures

**Add touch-action CSS if needed:**
```tsx
<main className="h-screen w-full overflow-hidden touch-none">
  {/* content */}
</main>
```

Or in global CSS:
```css
body {
  touch-action: none;
}

/* Allow scroll only in specific containers */
.scrollable {
  touch-action: pan-x pan-y;
}
```

## Files to Modify

1. `apps/photo/src/app/(booth)/control/[boothId]/page.tsx`
   - Ensure `<main>` has `h-screen overflow-hidden`

2. `apps/photo/src/app/(booth)/display/[boothId]/page.tsx`
   - Ensure `<main>` has `h-screen overflow-hidden`

3. `apps/photo/src/app/(booth)/layout.tsx` (if needed)
   - Add overflow-hidden wrapper

4. `apps/photo/src/app/globals.css` (if needed)
   - Add global scroll prevention

## Testing Checklist
- [ ] Control page has no scrolling
- [ ] Display page has no scrolling
- [ ] Image list can still scroll horizontally (internal scroll)
- [ ] No scroll bars appear
- [ ] Touch scroll gestures don't scroll the page
- [ ] All content is visible without scrolling
- [ ] Works on tablet (portrait and landscape)
- [ ] Works on large display (1920x1080)
- [ ] Works on smaller screens without breaking

## Completion Criteria
- [ ] No page-level scrolling on control page
- [ ] No page-level scrolling on display page
- [ ] Internal scrollable areas work correctly
- [ ] Tested on multiple screen sizes
- [ ] No layout overflow issues
- [ ] Touch gestures don't cause unwanted scrolling
