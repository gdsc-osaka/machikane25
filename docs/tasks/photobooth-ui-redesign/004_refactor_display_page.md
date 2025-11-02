# Task 004: Refactor Display Page

## Objective
Redesign the display page (`apps/photo/src/app/(booth)/display/[boothId]/page.tsx`) to match the new design specifications.

## File Location
`apps/photo/src/app/(booth)/display/[boothId]/page.tsx`

## Implementation Details

### 1. Page Container
- Add `overflow-hidden h-screen` to main container
- Center all content
- Use fixed height to prevent scrolling

```tsx
<main className="flex h-screen w-full items-center justify-center overflow-hidden">
```

### 2. Idle State (`renderIdle`)

**Layout:**
- Full-screen centered content
- Large welcoming text
- Similar styling to control page but different message

**Code structure:**
```tsx
const renderIdle = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
    <h1 className="text-7xl font-bold">Gemini AI フォトブース</h1>
    <p className="text-3xl animate-pulse">
      タブレットの画面をタップしてスタート
    </p>
  </div>
);
```

### 3. Menu State (`renderMenu`)

**Layout:**
- Centered instructional message
- Large, readable text
- Clear step-by-step instructions

**Code structure:**
```tsx
const renderMenu = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
    <p className="whitespace-pre-line text-center text-4xl font-semibold leading-relaxed">
      {`タブレットを操作してください
1. 画像を選ぶ
2. 写真を撮る
3. 決定`}
    </p>
  </div>
);
```

### 4. Capturing State (`renderCapturing`)

**Show webcam feed with countdown overlay:**
- Keep existing webcam logic
- Ensure countdown is visible over webcam
- Full-screen webcam feed

**Code structure:**
```tsx
const renderCapturing = () => (
  <div className="relative flex h-full w-full items-center justify-center bg-black">
    <div className="relative h-full w-full">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/png"
        videoConstraints={{
          width: 1920,
          height: 1080,
          facingMode: "user",
        }}
        className="h-full w-full object-cover"
      />
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <span className="text-[300px] font-bold text-white drop-shadow-2xl">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
```

### 5. Generating State (`renderGenerating`)

**Add progress bar (matching control page):**
```tsx
import { Progress } from "@/components/ui/progress";

const renderGenerating = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-purple-600 to-pink-600">
    <p className="text-5xl font-semibold text-white">画像を生成中...</p>
    <Progress value={undefined} className="w-[600px]" /> {/* indeterminate */}
  </div>
);
```

### 6. Completed State (`renderCompleted`)

**Full-screen generated image display:**
```tsx
const renderCompleted = () => {
  if (!latestGeneratedPhotoUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-xl text-muted-foreground">
          画像を読み込んでいます...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <Image
        src={latestGeneratedPhotoUrl}
        alt="生成された写真"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
};
```

### 7. Update Main Content Renderer

**Simplify the main structure:**
```tsx
const renderContent = () => {
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-xl text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  switch (boothState) {
    case "idle":
      return renderIdle();
    case "menu":
      return renderMenu();
    case "capturing":
      return renderCapturing();
    case "generating":
      return renderGenerating();
    case "completed":
      return renderCompleted();
    default:
      return renderIdle();
  }
};

return (
  <main className="flex h-screen w-full items-center justify-center overflow-hidden">
    {renderContent()}
  </main>
);
```

### 8. Remove Unnecessary Elements

**Remove from display page:**
- Header with "Display" title and booth ID (move to debug mode or remove entirely)
- Any navigation elements
- Keep the page clean and focused on content

## Testing Checklist
- [ ] Idle state displays correctly with welcoming message
- [ ] Menu state shows clear instructions
- [ ] Capturing state shows webcam feed properly
- [ ] Countdown overlay is visible and centered over webcam
- [ ] Generating state shows progress bar
- [ ] Completed state shows generated image in full screen
- [ ] No scrolling on the page
- [ ] All transitions are smooth
- [ ] Content is readable on large display
- [ ] Webcam permissions work correctly
- [ ] Photo capture works correctly

## Completion Criteria
- [ ] All 5 states implemented
- [ ] Layout matches design specification
- [ ] No scrolling
- [ ] State transitions work correctly
- [ ] Webcam functionality preserved
- [ ] Generated images display properly
- [ ] Code is clean and well-organized
- [ ] Synchronization with control page works
