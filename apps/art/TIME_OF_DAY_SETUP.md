# Time of Day System Setup Guide

The time-of-day system provides dynamic lighting and atmospheric changes for the aquarium installation, cycling through day, sunset, and night periods with smooth transitions.

## Architecture

### Components

1. **TimeOfDayPeriod** (`Assets/Art/Scripts/Presentation/TimeOfDayPeriod.cs`)
   - Data structure defining lighting settings for a specific time period
   - Controls: directional light, fog, ambient colors, water tint

2. **TimeOfDayConfig** (`Assets/Art/Scripts/Presentation/TimeOfDayConfig.cs`)
   - ScriptableObject configuration containing:
     - Three periods: day, sunset, night
     - Time mode (automatic cycle vs real-time)
     - Cycle duration and transition settings

3. **TimeOfDayController** (`Assets/Art/Scripts/Presentation/TimeOfDayController.cs`)
   - MonoBehaviour that manages the time-of-day cycle
   - Smoothly interpolates between periods
   - Applies settings to scene lighting, fog, and materials

## Unity Editor Setup

### 1. Add TimeOfDayController to Scene

1. Open the `Aquarium.unity` scene
2. Select the **AppRoot** GameObject
3. In the Inspector, find the AppRoot component
4. Locate the new fields:
   - **Time Of Day Controller** (under Controllers section)
   - **Time Of Day Config** (under Presentation Configuration section)

### 2. Create TimeOfDayController GameObject

1. In the Hierarchy, create a new empty GameObject
2. Rename it to "TimeOfDayController"
3. Add the **TimeOfDayController** component
4. Assign the scene's **Directional Light** to the controller:
   - Find the Directional Light in the scene
   - Drag it to the **Directional Light** field on TimeOfDayController

5. (Optional) Assign water materials:
   - Locate ocean/water materials (e.g., `Assets/Idyllic Fantasy Nature/Materials/Waterplants/Ocean.mat`)
   - Drag them to the **Water Materials** array
   - Set **Water Color Property** to the shader's color property name (e.g., `_Color`)

### 3. Configure Time Periods

1. Locate the config: `Assets/Art/Configs/TimeOfDay/DefaultTimeOfDayConfig.asset`
2. In the Inspector, you can customize:

#### Time Mode
- **Automatic Cycle**: Cycles through day/sunset/night automatically
  - Set **Cycle Duration Seconds** (default: 600 = 10 minutes for full cycle)
- **Real Time**: Uses system clock
  - Configure **Day Start Hour**, **Sunset Start Hour**, **Night Start Hour**

#### Day Period Settings
- Light Color: Bright white/yellow (default: rgb(1, 0.96, 0.84))
- Light Intensity: 1.0
- Light Rotation: High angle (50°, -30°, 0°)
- Fog Color: Light blue
- Fog Density: 0.015

#### Sunset Period Settings
- Light Color: Warm orange (default: rgb(1, 0.6, 0.3))
- Light Intensity: 0.7
- Light Rotation: Low angle (10°, -30°, 0°)
- Fog Color: Orange/pink hues
- Fog Density: 0.02

#### Night Period Settings
- Light Color: Cool moonlight blue (default: rgb(0.5, 0.6, 0.8))
- Light Intensity: 0.3
- Light Rotation: Below horizon (-20°, -30°, 0°)
- Fog Color: Deep blue
- Fog Density: 0.025

### 4. Wire Up in AppRoot

1. Select the **AppRoot** GameObject
2. Drag **TimeOfDayController** GameObject to the **Time Of Day Controller** field
3. Drag **DefaultTimeOfDayConfig** asset to the **Time Of Day Config** field

### 5. Test in Play Mode

1. Enter Play Mode
2. The system will start cycling through time periods
3. Use the context menu on TimeOfDayController to test:
   - Right-click component → **Force Day**
   - Right-click component → **Force Sunset**
   - Right-click component → **Force Night**

## Customization

### Creating Custom Periods

You can create multiple TimeOfDayConfig assets for different moods or seasons:

1. Right-click in Project window → **Create → Art → TimeOfDay Config**
2. Name it descriptively (e.g., "StormyDayConfig", "CalmNightConfig")
3. Adjust the period settings to match your vision
4. Swap configs on AppRoot to change the atmosphere

### Water Tint (Optional)

To enable dynamic water color changes:

1. On each TimeOfDayPeriod in the config, enable **Apply Water Tint**
2. Set the **Water Tint** color for each period
3. Ensure water materials are assigned on TimeOfDayController
4. Verify the **Water Color Property** name matches your shader

### Transition Speed

Adjust **Transition Duration Seconds** in the config to make transitions:
- Faster: Lower values (1-5 seconds) for abrupt changes
- Slower: Higher values (15-30 seconds) for gradual, subtle shifts

## Technical Details

### Update Cycle
- The controller runs in `Update()` each frame
- Time advances based on:
  - Automatic mode: `Time.deltaTime / cycleDurationSeconds`
  - Real-time mode: `DateTime.Now`

### Interpolation
- Uses `Mathf.SmoothStep` for smooth easing
- Quaternion.Slerp for light rotation
- Color.Lerp for all color values

### Performance
- Lightweight: Only updates RenderSettings and assigned materials
- No allocations during transitions
- Suitable for continuous operation in installation settings

## Troubleshooting

**Lighting doesn't change:**
- Verify TimeOfDayController is assigned on AppRoot
- Check that TimeOfDayConfig is assigned
- Ensure Directional Light is assigned on controller

**Transitions are too abrupt:**
- Increase **Transition Duration Seconds** in config

**Water doesn't change color:**
- Check that water materials are assigned
- Verify **Water Color Property** name matches shader property
- Enable **Apply Water Tint** on each period

**System time isn't working:**
- Ensure **Time Mode** is set to **Real Time**
- Check that hour ranges in config match your timezone expectations

## Integration with Visitor Detection

The time-of-day system runs independently but can be combined with visitor detection:
- Calm periods (night) when no visitors present
- Active periods (day/sunset) during visitor hours
- This would require custom logic in AppRoot to switch configs based on visitor events

## Files Reference

| File | Purpose |
|------|---------|
| `Assets/Art/Scripts/Presentation/TimeOfDayPeriod.cs` | Data structure for period settings |
| `Assets/Art/Scripts/Presentation/TimeOfDayConfig.cs` | ScriptableObject configuration |
| `Assets/Art/Scripts/Presentation/TimeOfDayController.cs` | Main controller MonoBehaviour |
| `Assets/Art/Configs/TimeOfDay/DefaultTimeOfDayConfig.asset` | Default configuration asset |
| `Assets/Art/Scripts/App/AppRoot.cs:72-75` | Integration point |
