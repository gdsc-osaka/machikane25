/**
 * T212 [FOUND] Application: Service Interfaces
 *
 * TypeScript interfaces for application services
 * Based on DDD principles - enables Dependency Inversion
 * (AGENTS.md: Use interfaces for abstractions)
 */

import type { User } from "firebase/auth";
import type {
	GenerationOption,
	GroupedGenerationOptions,
} from "@/domain/generationOption";

/**
 * Authentication Service Interface
 * Handles admin token validation and custom token creation
 */
export interface IAuthService {
	/**
	 * Validate admin token
	 * @param token - Plain text token from login
	 * @returns Promise resolving to true if valid, false otherwise
	 */
	validateAdminToken(token: string): Promise<boolean>;

	/**
	 * Create custom token for admin user
	 * @param uid - User ID
	 * @returns Promise resolving to custom token
	 */
	createCustomToken(uid: string): Promise<string>;

	/**
	 * Verify admin role from request
	 * @param idToken - Firebase ID token
	 * @returns Promise resolving to true if admin, false otherwise
	 */
	verifyAdminRole(idToken: string): Promise<boolean>;
}

/**
 * Photo Service Interface
 * Handles uploaded and generated photos
 */
export interface IPhotoService {
	/**
	 * Upload user photo to Storage and Firestore
	 * @param boothId - Booth ID
	 * @param photoData - Photo file data
	 * @returns Promise resolving to uploaded photo ID
	 */
	uploadUserPhoto(boothId: string, photoData: Buffer): Promise<string>;

	/**
	 * Delete used photo (after generation)
	 * @param boothId - Booth ID
	 * @param photoId - Photo ID
	 * @returns Promise resolving when deletion completes
	 */
	deleteUsedPhoto(boothId: string, photoId: string): Promise<void>;

	/**
	 * Get generated photo by ID
	 * @param boothId - Booth ID
	 * @param photoId - Photo ID
	 * @returns Promise resolving to photo URL or null if not found/expired
	 */
	getGeneratedPhoto(
		boothId: string,
		photoId: string,
	): Promise<{
		id: string;
		imageUrl: string;
	} | null>;
}

/**
 * Booth Service Interface
 * Manages booth state transitions
 */
export interface IBoothService {
	/**
	 * Create new booth session
	 * @param boothId - Booth ID
	 * @returns Promise resolving when session is created
	 */
	createSession(boothId: string): Promise<void>;

	/**
	 * Start capture mode
	 * @param boothId - Booth ID
	 * @returns Promise resolving when state updated
	 */
	startCapture(boothId: string): Promise<void>;

	/**
	 * Select generation options
	 * @param boothId - Booth ID
	 * @param optionIds - Selected option IDs
	 * @returns Promise resolving when options saved
	 */
	selectOptions(boothId: string, optionIds: string[]): Promise<void>;

	/**
	 * Start AI generation
	 * @param boothId - Booth ID
	 * @param sourcePhotoId - Uploaded photo ID
	 * @param optionIds - Selected generation option IDs
	 * @returns Promise resolving to generated photo ID
	 */
	startGeneration(
		boothId: string,
		sourcePhotoId: string,
		optionIds: string[],
	): Promise<string>;

	/**
	 * Complete generation (update booth state to completed)
	 * @param boothId - Booth ID
	 * @param photoId - Generated photo ID
	 * @returns Promise resolving when state updated
	 */
	completeGeneration(boothId: string, photoId: string): Promise<void>;

	/**
	 * Reset booth to idle state
	 * @param boothId - Booth ID
	 * @returns Promise resolving when state reset
	 */
	resetIdle(boothId: string): Promise<void>;
}

/**
 * Generation Service Interface
 * Handles AI generation and options
 */
export interface IGenerationService {
	/**
	 * Get all generation options grouped by typeId
	 * @returns Promise resolving to grouped options
	 */
	getOptions(): Promise<GroupedGenerationOptions>;

	/**
	 * Generate AI photo using Gemini API
	 * @param sourcePhotoId - Uploaded photo ID
	 * @param optionIds - Selected generation option IDs
	 * @returns Promise resolving to generated photo data
	 */
	generatePhoto(
		sourcePhotoId: string,
		optionIds: string[],
	): Promise<{
		photoId: string;
		imageUrl: string;
	}>;
}
