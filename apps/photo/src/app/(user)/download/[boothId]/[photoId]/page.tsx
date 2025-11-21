import Image from "next/image";
import { notFound } from "next/navigation";
import { getGeneratedPhotoAction } from "@/app/actions/generationActions";
import { GEMINI_PRO_IMAGE_MODEL_ID } from "@/domain/models";
import clsx from "clsx";

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

	const { imageUrl, modelId, relatedPhotos } = result.data;
	const photosToDisplay =
		relatedPhotos && relatedPhotos.length > 0
			? relatedPhotos
			: [{ id: photoId, imageUrl, modelId }];

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-background px-6 py-16 text-center">
			<h1 className="text-3xl font-semibold">Your AI Photos</h1>

			<div className="flex flex-wrap justify-center gap-8">
				{photosToDisplay.map((photo, index) => {
					const isPro = photo.modelId === GEMINI_PRO_IMAGE_MODEL_ID;
					return (
						<div key={photo.id} className="flex flex-col items-center gap-4">
							<div className="relative">
								{isPro && (
									<div className="absolute -right-4 -top-4 z-10 rounded-full bg-pro-badge px-3 py-1 text-sm font-bold text-black shadow-md">
										PRO
									</div>
								)}
								<Image
									src={photo.imageUrl}
									alt={`AI-generated result ${index + 1}`}
									width={512}
									height={512}
									sizes="(max-width: 768px) 90vw, 400px"
									className={clsx(
										"max-h-[50vh] w-auto rounded-lg shadow-lg",
										isPro ? "ring-4 ring-pro-badge/50" : "",
									)}
								/>
							</div>
							<a
								href={photo.imageUrl}
								download={`ai_photo_${index + 1}.png`}
								className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground shadow transition hover:bg-primary/90"
							>
								Download Photo {photosToDisplay.length > 1 ? index + 1 : ""}
							</a>
						</div>
					);
				})}
			</div>
		</main>
	);
};

export default DownloadPage;
