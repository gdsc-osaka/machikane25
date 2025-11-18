"use client";

import { Button } from "@/components/ui/button";

type DownloadButtonProps = {
	imageUrl: string;
};

export const DownloadButton = ({ imageUrl }: DownloadButtonProps) => {
	const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		try {
			const response = await fetch(imageUrl);
			if (!response.ok) throw new Error("Network response was not ok");
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const now = new Date();
			const timestamp = now
				.toISOString()
				.replace(/[-:]|\..*$/g, "")
				.replace("T", "_");
			link.download = `artifoto_${timestamp}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download failed:", error);
			// Fallback to opening in new tab if download fails
			window.open(imageUrl, "_blank");
		}
	};

	return (
		<Button
			onClick={handleDownload}
			className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground shadow transition hover:bg-primary/90 cursor-pointer"
		>
			Download Photo
		</Button>
	);
};
