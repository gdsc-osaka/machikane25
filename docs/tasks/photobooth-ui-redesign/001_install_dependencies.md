# Task 001: Install Dependencies and Check Components

## Objective
Verify and install all required UI components and dependencies for the redesign.

## Required Components

### 1. Progress Component (shadcn/ui)
Check if progress component exists at:
- `apps/photo/src/components/ui/progress.tsx`

If not, install using:
```bash
cd apps/photo
npx shadcn@latest add progress
```

### 2. Verify Existing Dependencies
All should already be installed (verify in package.json):
- `framer-motion`: For animations
- `react-qr-code`: For QR code generation
- `react-webcam`: For webcam access
- `next`: For image optimization

## Directory Structure
```
apps/photo/src/
├── components/
│   └── ui/
│       ├── button.tsx (existing)
│       ├── card.tsx (existing)
│       ├── separator.tsx (existing)
│       └── progress.tsx (to be verified/installed)
└── app/
    └── (booth)/
        ├── control/[boothId]/page.tsx
        └── display/[boothId]/page.tsx
```

## Testing
- [ ] Verify progress component can be imported
- [ ] Verify all dependencies are in package.json

## Completion Criteria
- [ ] Progress component is available
- [ ] No missing dependencies
- [ ] Can successfully build the project
