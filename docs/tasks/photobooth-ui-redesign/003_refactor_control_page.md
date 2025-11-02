# Task 003: Refactor Control Page

## Objective
Redesign the control page (`apps/photo/src/app/(booth)/control/[boothId]/page.tsx`) to match the new design specifications.

## File Location
`apps/photo/src/app/(booth)/control/[boothId]/page.tsx`

## Implementation Details

### 1. Page Container
- Add `overflow-hidden h-screen` to main container
- Remove max-width constraint or adjust for tablet
- Use fixed height to prevent scrolling

```tsx
<main className="flex h-screen w-full flex-col overflow-hidden">
```

### 2. Idle State (`renderIdle`)

**Layout:**
- Full-screen background
- Centered content
- Tap anywhere to start

**Code structure:**
```tsx
const renderIdle = () => (
  <button
    type="button"
    onClick={handleStartSession}
    className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-500 to-purple-600 text-white"
  >
    <h1 className="text-5xl font-bold">Gemini AI フォトブース</h1>
    <p className="text-2xl animate-pulse">画面をタップしてスタート</p>
  </button>
);
```

### 3. Menu State (`renderMenu`)

**Layout Structure:**
```tsx
<div className="flex h-full w-full">
  {/* Left Side - Uploaded Images */}
  <div className="flex-1 p-6">
    <h2>画像を選ぶ</h2>
    <div className="horizontal-scroll-container">
      {/* Image thumbnails */}
    </div>
  </div>

  {/* Right Side - Options and Actions */}
  <div className="flex flex-1 flex-col p-6">
    {/* Generation Options - Top */}
    <div className="flex-1">
      {/* Toggle groups */}
    </div>

    {/* Selected Options Thumbnails */}
    <div className="my-4">
      {/* Thumbnail list */}
    </div>

    {/* Action Buttons - Bottom */}
    <div className="flex gap-4">
      <Button onClick={handleStartCapture}>
        📷 写真を撮る
      </Button>
      <Button onClick={handleStartGeneration} disabled={isGenerateDisabled}>
        ✓ 決定
      </Button>
    </div>
  </div>
</div>
```

**Key Components:**
- Image selection: Horizontal scroll, aspect-ratio-[4/5]
- Generation options: Use existing Card/Button pattern, but arrange vertically
- Selected options thumbnails: Show imageUrl from each selected option
- Buttons: Large, touch-friendly (min height 60px)

### 4. Capturing State (`renderCapturing`)

**Keep existing countdown logic:**
- Large countdown numbers (5-1)
- Center screen
- framer-motion animations

**Update styling:**
```tsx
const renderCapturing = () => (
  <div className="flex h-full w-full flex-col items-center justify-center bg-black">
    <AnimatePresence mode="wait">
      {countdown !== null && countdown >= 0 && (
        <motion.div
          key={countdown}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-[200px] font-bold text-white">
            {countdown > 0 ? countdown : "📸"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
```

### 5. Generating State (`renderGenerating`)

**Add progress bar:**
```tsx
import { Progress } from "@/components/ui/progress";

const renderGenerating = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-purple-500 to-pink-500">
    <p className="text-3xl font-semibold text-white">画像を生成中...</p>
    <Progress value={undefined} className="w-96" /> {/* indeterminate */}
  </div>
);
```

### 6. Completed State (`renderCompleted`)

**Focus on QR code:**
```tsx
const renderCompleted = () => {
  // ... existing QR code logic ...

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-green-500 to-blue-500">
      <p className="text-3xl font-semibold text-white">
        画像のダウンロードはこちらから
      </p>
      <div className="rounded-2xl bg-white p-8 shadow-2xl">
        <QRCode value={qrValue} size={256} />
      </div>
      {/* Optional: small preview of generated image */}
    </div>
  );
};
```

### 7. Back Button (All States)

**Add to top-left of each state (except idle):**
```tsx
const BackButton = () => (
  <button
    type="button"
    onClick={handleDiscardSession}
    className="absolute left-4 top-4 rounded-full bg-white/20 p-3 backdrop-blur-sm hover:bg-white/30"
  >
    ← ホーム
  </button>
);
```

Add to each render function (menu, capturing, generating, completed).

### 8. Helper Function: Render Selected Options Thumbnails

```tsx
const renderSelectedOptionsThumbnails = () => {
  const selectedOptionsList = Object.entries(selectedOptions)
    .map(([typeId, optionId]) => {
      const option = options[typeId]?.find((opt) => opt.id === optionId);
      return option?.imageUrl ? option : null;
    })
    .filter((opt): opt is GenerationOptionItem => opt !== null);

  if (selectedOptionsList.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto">
      {selectedOptionsList.map((option) => (
        <div key={option.id} className="h-16 w-16 flex-shrink-0">
          <Image
            src={option.imageUrl}
            alt={option.displayName}
            width={64}
            height={64}
            className="h-full w-full rounded object-cover"
          />
        </div>
      ))}
    </div>
  );
};
```

## Testing Checklist
- [ ] Idle state displays correctly and taps work
- [ ] Menu state shows all sections properly
- [ ] Image selection works with blue border on selected
- [ ] Generation options toggle correctly
- [ ] Selected options thumbnails display
- [ ] Buttons are disabled/enabled correctly
- [ ] Capturing countdown works
- [ ] Generating state shows progress bar
- [ ] Completed state shows QR code
- [ ] Back button works from all states
- [ ] No scrolling on the page
- [ ] Responsive on tablet dimensions

## Completion Criteria
- [ ] All 5 states implemented
- [ ] Back button functional in all states (except idle)
- [ ] Layout matches design specification
- [ ] No scrolling
- [ ] State transitions work correctly
- [ ] Code is clean and well-organized
