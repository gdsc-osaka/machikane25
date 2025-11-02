# Photobooth UI Redesign - Architecture Document

## Overview

This document outlines the architecture for redesigning the photobooth application's user interface. The photobooth consists of two synchronized pages: a control page (shown on a tablet) and a display page (shown on a large display), both running on the same device.

## Current State Analysis

### Existing Components
- **Control Page**: `/apps/photo/src/app/(booth)/control/[boothId]/page.tsx`
- **Display Page**: `/apps/photo/src/app/(booth)/display/[boothId]/page.tsx`
- **Hooks**:
  - `useBoothState`: Manages booth state from Firestore
  - `useGenerationOptions`: Fetches generation options (themes)
  - `useUploadedPhotos`: Manages uploaded photo list
- **Actions**: `startSession`, `discardSession`, `startCapture`, `completeCapture`, `startGeneration`

### Current State Machine
States: `idle`, `menu`, `capturing`, `generating`, `completed`

Transitions:
- idle → menu (via `startSession`)
- menu → capturing (via `startCapture`)
- capturing → menu (via `completeCapture`)
- menu → generating (via `startGeneration`)
- generating → completed (automatic)
- completed → idle (via `discardSession`)

## Design Requirements

### Design Philosophy
- Pop and fun to use with sophisticated dark theme
- Use images and icons for visual appeal
- Fixed layout (no scrolling)
- Touch-friendly interface for tablet

### Color Palette (Dark Theme)
- **Primary**: Blue (#4796E3)
- **Secondary**: Purple (#9177C7), Red (#CA6673)
- **Base Background**: Dark grey (#303030)
- **Borders**: #444746
- **Foreground Text**: #e3e3e3
- **Gradients**: Blue → Purple → Red for headings and important text

### Control Page States

#### 1. Idle State
- Welcome message: "Gemini AI フォトブース"
- Prompt: "画面をタップしてスタート"
- Tap anywhere to transition to menu

#### 2. Menu State
Layout structure:
```
┌─────────────────────────────────────────────┐
│ [Back] Button                               │
│                                             │
│ ┌──────────────┐  ┌────────────────────┐  │
│ │              │  │ Generation Options │  │
│ │   Uploaded   │  │ (Top-Right)        │  │
│ │   Image      │  └────────────────────┘  │
│ │   Selection  │  ┌────────────────────┐  │
│ │   List       │  │ Selected Options   │  │
│ │   (Left)     │  │ Thumbnails         │  │
│ │              │  │ (Below Options)    │  │
│ │              │  └────────────────────┘  │
│ │              │  ┌────────────────────┐  │
│ │              │  │ [写真を撮る] [決定] │  │
│ │              │  │ (Bottom-Right)     │  │
│ └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────┘
```

Components:
- **Uploaded Image List**: Horizontal scrollable list, 4:5 aspect ratio thumbnails, blue border for selected
- **Generation Options**: Toggle group for each typeId (only 1 per typeId)
- **Selected Options Thumbnails**: Horizontal list showing imageUrls of selected options
- **Action Buttons**:
  - "写真を撮る" (left): Triggers photo capture
  - "決定" (right): Starts generation (disabled if no photo or incomplete options)

#### 3. Capturing State
- Countdown from 5 to 1 in large font
- Center of screen
- Animated transitions

#### 4. Generating State
- Message: "画像を生成中..."
- Progress bar below message

#### 5. Completed State
- QR code at center
- Label: "画像のダウンロードはこちらから"
- QR links to `/download/${boothId}/${photoId}`

**All states**: Small back button at top-left to return to idle

### Display Page States

**IMPORTANT**: Display page is designed for **portrait orientation (9:21 aspect ratio)**

#### 1. Idle State
- Welcome message: "Gemini AI フォトブース" (split across 2 lines)
- Prompt: "タブレットの画面をタップしてスタート" (split across 2 lines)
- Responsive text sizes with padding

#### 2. Menu State
- Message at center:
  ```
  タブレットを操作してください
  1. 画像を選ぶ
  2. 写真を撮る
  3. 決定
  ```
- Responsive text size (4xl on portrait, 5xl on larger)

#### 3. Capturing State
- Webcam feed at center (portrait: 1080x1920)
- Countdown overlay (200px on portrait, 300px on larger displays)
- Full-screen coverage

#### 4. Generating State
- Message: "画像を生成中..."
- Progress bar (75% width, max 2xl) with responsive sizing

#### 5. Completed State
- Generated image at center
- Full screen display with `object-contain`
- Black background

## Technical Specifications

### State Management
- Continue using existing Firestore real-time sync
- No changes to backend state machine
- States remain: idle, menu, capturing, generating, completed

### New Components Required

1. **ProgressBar Component**
   - Location: `apps/photo/src/components/ui/progress.tsx` (if not exists)
   - Use shadcn/ui progress component or create custom
   - Shows indeterminate or determinate progress

2. **IdleScreen Component** (optional, for code organization)
   - Reusable component for idle state
   - Can be styled differently for control vs display

3. **Layout Container**
   - Disable scrolling on both pages
   - Fullscreen, fixed height: `h-screen overflow-hidden`

### Styling Requirements

1. **Disable Scrolling**
   - Add to both page components: `overflow-hidden h-screen`
   - Ensure no child elements create overflow

2. **Responsive Design**
   - Control page: Tablet-optimized (portrait/landscape)
   - Display page: Large screen optimized (landscape)

3. **Visual Design**
   - Use Tailwind 4 tokens
   - Leverage framer-motion for animations
   - Pop and fun aesthetic with bright colors
   - Round corners and shadows for depth

### Images and Assets Needed

Request from user:
1. **Background Images**:
   - Idle state background (control)
   - Idle state background (display)
2. **Button Icons**:
   - Camera icon for "写真を撮る"
   - Checkmark icon for "決定"
3. **Decorative Elements**:
   - Border decorations
   - Frame overlays (optional)

### Dependencies

All required dependencies are already installed:
- `framer-motion`: Animations
- `react-qr-code`: QR code generation
- `react-webcam`: Webcam access
- `next/image`: Image optimization
- shadcn/ui components: Button, Card, etc.

Check if `progress` component from shadcn is installed. If not, install it.

## Implementation Strategy

### Phase 1: Preparation
1. Check and install missing UI components (progress bar)
2. Gather required images from user
3. Add images to appropriate directory (e.g., `apps/photo/public/images/`)

### Phase 2: Control Page Refactor
1. Restructure render functions for new layout
2. Implement idle state with tap-to-start
3. Redesign menu state with new layout
4. Update capturing state
5. Add progress bar to generating state
6. Update completed state with QR code focus
7. Add back button to all states
8. Disable scrolling

### Phase 3: Display Page Refactor
1. Implement idle state
2. Update menu state with instructions
3. Ensure capturing state shows webcam properly
4. Add progress bar to generating state
5. Ensure completed state shows full-screen image
6. Disable scrolling

### Phase 4: Testing
1. Test state transitions
2. Test synchronization between pages
3. Test on tablet device
4. Test on display
5. Visual QA

## Risk Mitigation

1. **State Sync Issues**: Both pages rely on Firestore real-time sync. Ensure no race conditions.
2. **Webcam Access**: Test webcam permissions and error handling.
3. **QR Code Generation**: Test with various base URLs and deployment scenarios.
4. **Responsive Layout**: Test on actual tablet and display dimensions.
5. **Image Loading**: Ensure all images load properly and have fallbacks.

## Success Criteria

- [x] Both pages implement all 5 states correctly
- [x] State transitions work as specified
- [x] Scrolling is disabled on both pages
- [x] UI is visually appealing and matches design philosophy
- [x] Back button works from all states (control page)
- [x] QR code generation works correctly
- [x] Webcam capture works reliably (portrait: 1080x1920)
- [x] Display page optimized for portrait orientation (9:21)
- [ ] All tests pass (to be verified by user)
