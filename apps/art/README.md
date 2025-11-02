# Interactive Art Installation for machikane 25

## Getting Started
1. Install Unity Hub and Unity Editor (6000.2.6f2)
2. Clone this repository
3. Run `dotnet restore` in `path/to/machikane25/apps/art`
4. Open the project in Unity Hub

## Project Structure
```
Assets/Art/
├── Scripts/
│   ├── App/              # AppRoot bootstrap, editor utilities
│   ├── Fish/             # FishData, polling, repository, spawner
│   ├── Visitors/         # VisitorDetector, OpenCV wrappers, calibration
│   ├── Presentation/Schools/  # Boids simulation, SchoolCoordinator
│   ├── Rare/             # Rare character definitions, spawn handlers
│   ├── Telemetry/        # Sentry integration
│   └── Infrastructure/   # HTTP helpers, Firebase downloader, config utils
├── Configs/              # ScriptableObject assets (URLs, cadence, boids tuning)
├── Fish/                 # Prefabs, materials, textures
├── Scenes/               # Main scene: Aquarium.unity
└── Tests/
    ├── EditMode/         # Unit tests (no scene)
    └── PlayMode/         # Integration tests (with scene)
```

## Git guidelines
* All `Assets/*` directories except `Assets/Art`, `Assets/HDRPDefaultResources`, etc are uploaded to Git LFS. 
