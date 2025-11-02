/**
 * Sound types used in the photobooth application
 */
export type SoundType =
	| "start"
	| "menu"
	| "countdown"
	| "shutter"
	| "confirm"
	| "generating"
	| "completed";

/**
 * Sound file paths mapping
 * These files should be placed in the public/sounds directory
 */
const SOUND_PATHS: Record<SoundType, string> = {
	start: "/sounds/start.mp3",
	menu: "/sounds/menu.mp3",
	countdown: "/sounds/countdown.mp3",
	shutter: "/sounds/shutter.mp3",
	confirm: "/sounds/confirm.mp3",
	generating: "/sounds/generating.mp3",
	completed: "/sounds/completed.mp3",
};

/**
 * Audio cache for preloaded sounds
 */
const audioCache = new Map<SoundType, HTMLAudioElement>();

/**
 * Preload a sound file into memory
 * @param type - The type of sound to preload
 */
const preloadSound = (type: SoundType): void => {
	if (typeof window === "undefined") {
		return;
	}

	if (audioCache.has(type)) {
		return;
	}

	try {
		const audio = new Audio(SOUND_PATHS[type]);
		audio.preload = "auto";
		audioCache.set(type, audio);
	} catch (error) {
		console.warn(`Failed to preload sound: ${type}`, error);
	}
};

/**
 * Preload all sounds used in the photobooth application
 * Should be called when the application initializes
 */
export const preloadAllSounds = (): void => {
	if (typeof window === "undefined") {
		return;
	}

	const soundTypes: SoundType[] = [
		"start",
		"menu",
		"countdown",
		"shutter",
		"confirm",
		"generating",
		"completed",
	];

	for (const type of soundTypes) {
		preloadSound(type);
	}
};

/**
 * Play a sound effect
 * @param type - The type of sound to play
 * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
 * @returns Promise that resolves when the sound starts playing
 */
export const playSound = async (
	type: SoundType,
	volume = 1.0,
): Promise<void> => {
	if (typeof window === "undefined") {
		return;
	}

	try {
		// Get from cache or create new audio element
		let audio = audioCache.get(type);

		if (!audio) {
			audio = new Audio(SOUND_PATHS[type]);
			audioCache.set(type, audio);
		}

		// Reset to start if already playing
		audio.currentTime = 0;
		audio.volume = Math.max(0, Math.min(1, volume));

		await audio.play();
	} catch (error) {
		// Log error but don't throw - sound is not critical to app functionality
		console.warn(`Failed to play sound: ${type}`, error);
	}
};

/**
 * Stop a currently playing sound
 * @param type - The type of sound to stop
 */
export const stopSound = (type: SoundType): void => {
	if (typeof window === "undefined") {
		return;
	}

	try {
		const audio = audioCache.get(type);
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
		}
	} catch (error) {
		console.warn(`Failed to stop sound: ${type}`, error);
	}
};

/**
 * Clear the audio cache
 * Useful for cleanup when the app is unmounted
 */
export const clearSoundCache = (): void => {
	for (const [, audio] of audioCache) {
		try {
			audio.pause();
			audio.src = "";
		} catch (error) {
			console.warn("Failed to clear audio", error);
		}
	}
	audioCache.clear();
};
