import Image from "next/image";
import { notFound } from "next/navigation";
import { getGeneratedPhotoAction } from "@/app/actions/generationActions";

type DownloadPageProps = {
	params: Promise<{
		boothId: string;
		photoId: string;
	}>;
};

const expiredMessage =
	"This download link has expired. Please rescan your QR code at the booth to regenerate your photo.";

const DownloadPage = async ({ params }: DownloadPageProps) => {
	const { boothId, photoId } = await params;
	const result = await getGeneratedPhotoAction(boothId, photoId);

	if (result.error === "NOT_FOUND") {
		notFound();
	}

	if (result.error === "EXPIRED") {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center">
				<h1 className="text-3xl font-semibold">Download unavailable</h1>
				<p className="max-w-md text-muted-foreground">{expiredMessage}</p>
			</main>
		);
	}

	if (!result.data) {
		notFound();
		return null;
	}

	const { imageUrl } = result.data;

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-center">
			<h1 className="text-3xl font-semibold">Your AI photo</h1>
			<Image
				src={imageUrl}
				alt="AI-generated result"
				width={1024}
				height={1024}
				sizes="(max-width: 1024px) 90vw, 512px"
				className="max-h-[60vh] w-auto rounded-lg shadow-lg"
			/>
			<a
				href={imageUrl}
				download="ai_photo.png"
				className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground shadow transition hover:bg-primary/90"
			>
				Download Photo
			</a>
		</main>
	);
};

export default DownloadPage;
