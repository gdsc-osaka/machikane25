# Photobooth Sound Files

This directory contains sound effects used in the photobooth application.

## Required Sound Files

The following sound files should be placed in this directory:

1. **start.mp3** - Played when transitioning from 'idle' to 'menu' state
2. **menu.mp3** - Played when user taps option buttons (except 決定 button) in the control page
3. **countdown.mp3** - Played each second during the countdown in the capturing state
4. **shutter.mp3** - Played when a photo is taken
5. **confirm.mp3** - Played when user taps the 決定 (confirm) button
6. **generating.mp3** - Played when transitioning from 'menu' to 'generating' state
7. **completed.mp3** - Played when transitioning from 'generating' to 'completed' state

## Sound Format

- Format: MP3 (recommended for broad browser support)
- Sample Rate: 44.1 kHz or 48 kHz
- Bit Rate: 128 kbps or higher
- Duration: Keep sounds short (0.5-2 seconds) for better UX

## Notes

- If sound files are missing, the application will continue to work but without audio feedback
- Sounds are preloaded when the application initializes for better performance
- All errors are caught and logged, so missing sounds won't break the application
