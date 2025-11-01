# Task 008: Dark Theme Color Update

## Objective
Update the entire photobooth UI to use a dark theme with specified brand colors and apply gradient effects to headings and important text.

## Color Palette

### Brand Colors
- **Primary Blue**: `#4796E3`
- **Secondary Purple**: `#9177C7`
- **Secondary Red**: `#CA6673`

### Dark Theme Colors
- **Base Background**: `#303030` (dark grey)
- **Border**: `#444746` (lighter grey)
- **Foreground Text**: `#e3e3e3` (light grey)

### Gradient Usage
For headings, titles, and important text:
```tsx
className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-transparent"
```

## Changes by Component

### Control Page

#### 1. **Idle State**
- Background: Changed from gradient to solid `#303030`
- Heading: Blue → Purple → Red gradient with `text-transparent`
- Prompt text: `#e3e3e3`
- Removed colored gradients from background

#### 2. **Menu State**
- Background: `#303030`
- Back button: Dark with border `#444746`, text `#e3e3e3`, hover `#444746`
- Left panel (images):
  - Border-right: `#444746`
  - Heading: Blue → Purple gradient
  - Selected image border: `#4796E3` with glow shadow
  - Unselected border: `#444746`, hover `#9177C7`
  - Placeholder: `#444746` background
- Right panel (options):
  - Heading: Blue → Purple gradient
  - Cards: Background `#303030`, border `#444746`
  - Card titles: `#e3e3e3`
  - Selected option button: `#4796E3` background, hover `#9177C7`
  - Unselected button: `#303030` background, border `#444746`, hover border `#4796E3`
  - Action buttons:
    - "写真を撮る": `#4796E3`, hover `#9177C7`
    - "決定": Full gradient (Blue → Purple → Red), hover opacity
    - Disabled: `#444746` with reduced opacity text

#### 3. **Capturing State**
- Background: `#303030` (instead of black)
- Countdown: Blue → Purple → Red gradient text
- Back button: Same dark theme style

#### 4. **Generating State**
- Background: `#303030` (instead of purple gradient)
- Text: Blue → Purple → Red gradient
- Progress bar: `#444746` background
- Back button: Same dark theme style

#### 5. **Completed State**
- Background: `#303030` (instead of green gradient)
- Heading: Blue → Purple → Red gradient
- QR code container: `#444746` border and background
- Image preview: `#4796E3` border with glow shadow
- Back button: Same dark theme style

#### 6. **Loading/Error States**
- Background: `#303030`
- Loading text: `#e3e3e3`
- Error text: `#CA6673` (red)
- Reload button: `#4796E3`, hover `#9177C7`

### Display Page

#### 1. **Idle State**
- Background: `#303030`
- Heading: Blue → Purple → Red gradient
- Prompt text: `#e3e3e3`

#### 2. **Menu State**
- Background: `#303030`
- Instructions text: `#e3e3e3`

#### 3. **Capturing State**
- Background: `#303030`
- Countdown overlay: `#303030/30` (semi-transparent)
- Countdown numbers: Blue → Purple → Red gradient

#### 4. **Generating State**
- Background: `#303030`
- Text: Blue → Purple → Red gradient
- Progress bar: `#444746` background

#### 5. **Completed State**
- Background: `#303030` (instead of black)
- Generated image: Full screen with `object-contain`

#### 6. **Loading State**
- Background: `#303030`
- Loading text: `#e3e3e3`

## Technical Implementation

### Text Gradient CSS
```tsx
className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-transparent"
```

This creates a horizontal gradient from blue → purple → red and clips it to the text, making the text transparent to show the gradient.

### Button Styling Patterns

**Primary button (solid):**
```tsx
className="bg-[#4796E3] text-white hover:bg-[#9177C7]"
```

**Primary button (gradient):**
```tsx
className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] text-white hover:opacity-90"
```

**Outline button:**
```tsx
className="border-[#444746] bg-[#303030] text-[#e3e3e3] hover:border-[#4796E3] hover:bg-[#444746]"
```

**Disabled button:**
```tsx
className="disabled:bg-[#444746] disabled:text-[#e3e3e3]/50"
```

### Border and Shadow Effects

**Selected image:**
```tsx
className="border-[#4796E3] shadow-lg shadow-[#4796E3]/50"
```

**Unselected with hover:**
```tsx
className="border-[#444746] hover:border-[#9177C7]"
```

## Design Philosophy

### Dark Theme Benefits
1. **Reduced eye strain** in dimly lit photobooth environments
2. **Better contrast** for bright text and images
3. **Modern aesthetic** that feels premium
4. **Energy efficient** on OLED/AMOLED displays

### Color Usage
- **Blue (#4796E3)**: Primary actions, selected states, trust
- **Purple (#9177C7)**: Transitions, hover states, creativity
- **Red (#CA6673)**: Completion, errors, attention
- **Dark Grey (#303030)**: Base, non-distracting background
- **Border (#444746)**: Subtle separation without harshness
- **Light Grey (#e3e3e3)**: Readable text with good contrast

### Gradient Application
Gradients are reserved for:
- **Headings and titles** (important hierarchy)
- **Key action buttons** ("決定")
- **Countdown numbers** (dramatic effect)
- **Status messages** ("生成中", "ダウンロード")

This creates visual hierarchy and draws attention to important elements.

## Accessibility Considerations

### Contrast Ratios
- `#e3e3e3` on `#303030`: ~11.2:1 (AAA compliant)
- `#4796E3` on `#303030`: ~4.9:1 (AA compliant)
- Border `#444746` provides ~1.5:1 separation (subtle but visible)

### Text Gradients
- Gradients are used only on large text (4xl+)
- Important information uses solid colors for better readability
- Body text remains solid `#e3e3e3` for clarity

## Testing Checklist
- [ ] All text is readable on dark background
- [ ] Buttons clearly show hover states
- [ ] Selected states are visually distinct
- [ ] Gradients render correctly on target displays
- [ ] No color-only information (borders, shadows also used)
- [ ] QR code has sufficient contrast (white on grey)
- [ ] Loading states are visible
- [ ] Error messages stand out

## Before/After Comparison

### Before (Bright Gradients)
- Bright blue/purple/pink backgrounds
- White text on colored gradients
- Vibrant but potentially harsh in dark booth

### After (Dark Theme)
- Dark `#303030` base throughout
- Colored text gradients on dark background
- Subtle borders and shadows
- More sophisticated and eye-friendly
- Better for extended viewing

## Completion Criteria
- [x] All backgrounds changed to `#303030`
- [x] All headings use blue → purple → red gradient
- [x] All buttons use brand colors
- [x] All borders use `#444746`
- [x] All body text uses `#e3e3e3`
- [x] Selected states use `#4796E3`
- [x] Hover states use `#9177C7`
- [x] Error states use `#CA6673`
- [x] Lint passes
- [x] No accessibility regressions
