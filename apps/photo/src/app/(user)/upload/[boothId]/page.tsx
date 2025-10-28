"use client";

import { useParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadUserPhoto } from "@/app/actions/photoActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureAnonymousSignIn } from "@/lib/firebase/client";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ensureBoothId = (value: unknown): string =>
	typeof value === "string" ? value : "";

const isAllowedType = (type: unknown): boolean =>
	typeof type === "string" && ALLOWED_MIME_TYPES.includes(type);

const isWithinSize = (size: unknown): boolean =>
	typeof size === "number" && size <= MAX_FILE_SIZE;

export default function UploadPage() {
	const params = useParams();
	const boothId = ensureBoothId((params as Record<string, unknown>)?.boothId);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		void ensureAnonymousSignIn().catch(() => {
			toast.error("匿名認証に失敗しました。ページを再読み込みしてください。");
		});
	}, []);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const fileList = event.target.files;
		const file = fileList && fileList.length > 0 ? fileList[0] : null;

		setSelectedFile(null);

		if (!file) {
			setErrorMessage(null);
			return;
		}

		if (!isAllowedType(file.type)) {
			setErrorMessage("対応していないファイル形式です。(PNG/JPEGのみ)");
			return;
		}

		if (!isWithinSize(file.size)) {
			setErrorMessage("ファイルサイズは20MB以下にしてください。");
			return;
		}

		setErrorMessage(null);
		setSelectedFile(file);
	};

	const handleUpload = () => {
		if (!selectedFile || !boothId) {
			return;
		}

		startTransition(async () => {
			try {
				await uploadUserPhoto({ boothId, file: selectedFile });
				toast.success("アップロードが完了しました。");
				setSelectedFile(null);
				setErrorMessage(null);
				const input = inputRef.current;
				if (input) {
					input.value = "";
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "アップロードに失敗しました。";
				toast.error(message);
			}
		});
	};

	const isUploadDisabled = useMemo(
		() => isPending || !selectedFile,
		[isPending, selectedFile],
	);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 md:p-10">
			<header className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-3xl font-bold">Upload</h1>
				<p className="text-sm text-muted-foreground">
					ブースID: {boothId || "準備中"} /
					写真ファイルを選択してアップロードしてください。
				</p>
			</header>
			<section className="w-full max-w-md space-y-6">
				<div className="space-y-2">
					<Label htmlFor="upload-file">写真ファイル</Label>
					<Input
						ref={inputRef}
						id="upload-file"
						type="file"
						accept={ALLOWED_MIME_TYPES.join(",")}
						onChange={handleFileChange}
						disabled={isPending}
					/>
					<p className="text-xs text-muted-foreground">
						対応形式: PNG / JPEG, 最大20MB
					</p>
					{errorMessage ? (
						<p className="text-sm text-destructive">{errorMessage}</p>
					) : null}
					{selectedFile ? (
						<p className="text-sm text-muted-foreground">
							選択中: {selectedFile.name}
						</p>
					) : null}
				</div>
				<Button
					onClick={handleUpload}
					className="w-full"
					disabled={isUploadDisabled}
				>
					アップロード
				</Button>
			</section>
		</main>
	);
}
