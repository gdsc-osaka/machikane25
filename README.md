# machikane25
まちかね祭2025年 GDGoC Osaka ブース用リポジトリ. pnpm のモノレポ構成.

## Getting Started
### Local Development Setup
```shell
# at project root, run
pnpm install

# run firebase emulator
pnpm emulator

# run development server
pnpm dev:photo # or pnpm dev:stamp
```

### Install dependencies
```shell
# Specify the package name
pnpm -F photo add package-name
# or
pnpm -F photo -F stamp add package-name
```

### Git Guidelines
* Commit Message Example:
  * `Update xxx.ts to improve performance`, `yyy コンポーネントのバグ修正`
* Branch Naming Convention:
  * `<username>/<feature-description>`
  * e.g., `harineko0/add-login-feature`
* Pull Request Guidelines:
  * Title: Briefly summarize the changes made. e.g., `Add login feature`
  * Description: Follow Pull Request Template

### Other Guidelines
* テストカバレッジを必ず 100% にすること.
* PR のレビュワーには各アプリの Tech Lead が必ず入ること.
* Tech Lead:
  * apps/art: @harineko0
  * apps/photo: @Nagomu0128
  * apps/stamp: @iusok3386

## Usage
```shell
# Run the development server
pnpm dev:photo
pnpm dev:stamp

# Build the project
pnpm build:photo
pnpm build:photo-cleaner
pnpm build:stamp
pnpm build

# Run the production server
pnpm start:photo
pnpm start:photo-cleaner
pnpm start:stamp

# Lint
pnpm lint # Check for linting issues
pnpm lint:fix # Auto-fix linting issues

# Test
pnpm test:photo
pnpm test:photo-cleaner
pnpm test:stamp
pnpm test

# Coverage
pnpm coverage

# Start Firebase Emulator
pnpm emulator

# Deploy Firebase
pnpm deploy:fire
pnpm deploy:fire:check # dry run
```

## Environment Variables
Ask the administrator for the `.env.local` file.
```
/
└─ apps
   ├─ stamp
   │  └─ .env.local
   └─ photo
      └─ .env.local
```
