/**
 * Icon components using emoji for the photobooth UI
 * This approach avoids external icon library dependencies
 */

import { cn } from "@/lib/utils";

interface IconProps {
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
	sm: "text-base",
	md: "text-2xl",
	lg: "text-4xl",
	xl: "text-6xl",
};

export function CameraIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="Camera"
		>
			📷
		</span>
	);
}

export function CheckIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="Check"
		>
			✓
		</span>
	);
}

export function HomeIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="Home"
		>
			🏠
		</span>
	);
}

export function BackIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="Back"
		>
			←
		</span>
	);
}

export function SparklesIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="Sparkles"
		>
			✨
		</span>
	);
}

export function PhotoIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="Photo"
		>
			📸
		</span>
	);
}

export function QRCodeIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block", sizeMap[size], className)}
			role="img"
			aria-label="QR Code"
		>
			📱
		</span>
	);
}

export function LoadingIcon({ className, size = "md" }: IconProps) {
	return (
		<span
			className={cn("inline-block animate-spin", sizeMap[size], className)}
			role="img"
			aria-label="Loading"
		>
			⏳
		</span>
	);
}
