# Task 002: Gather Required Assets

## Objective
Document and gather all images and visual assets needed for the redesigned UI.

## Required Images

### Background Images
1. **Idle Background (Control Page)**
   - Recommended size: 1920x1080px or larger
   - Format: PNG or JPG
   - Description: Fun, colorful background for "Gemini AI フォトブース" welcome screen
   - Filename suggestion: `idle-control-bg.png`

2. **Idle Background (Display Page)**
   - Recommended size: 1920x1080px or larger
   - Format: PNG or JPG
   - Description: Similar to control, but optimized for large display
   - Filename suggestion: `idle-display-bg.png`

### Button Icons (Optional)
3. **Camera Icon**
   - Size: 48x48px or SVG
   - Format: PNG with transparency or SVG
   - Description: Icon for "写真を撮る" button
   - Filename suggestion: `camera-icon.png` or `camera-icon.svg`

4. **Check/Confirm Icon**
   - Size: 48x48px or SVG
   - Format: PNG with transparency or SVG
   - Description: Icon for "決定" button
   - Filename suggestion: `check-icon.png` or `check-icon.svg`

### Decorative Elements (Optional)
5. **Frame Overlay**
   - Size: Variable
   - Format: PNG with transparency
   - Description: Decorative frame for photo display
   - Filename suggestion: `photo-frame.png`

## Asset Directory
All assets should be placed in:
```
apps/photo/public/images/photobooth/
├── idle-control-bg.png
├── idle-display-bg.png
├── camera-icon.svg
├── check-icon.svg
└── photo-frame.png
```

## Alternative: Using Emoji/Unicode Icons
If icons are not provided, we can use:
- 📷 for camera
- ✓ for check
- 🎨 for theme options

## Completion Criteria
- [ ] User provides images OR
- [ ] Confirm use of text-only/emoji approach
- [ ] All provided images are placed in correct directory
- [ ] Images are optimized for web (compressed appropriately)
