import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type RedemptionDialogState =
	| {
			status: "redeemable";
			attendeeId: string;
			redeemedAt?: never;
			error?: never;
	  }
	| {
			status: "duplicate";
			attendeeId: string;
			redeemedAt: string;
			error?: never;
	  }
	| {
			status: "invalid";
			attendeeId?: never;
			redeemedAt?: never;
			error: "not-found" | "format";
	  };

type RedemptionDialogProps = {
	state: RedemptionDialogState;
	onManualEntry?: () => void;
	footer?: ReactNode;
	onClose?: () => void;
};

const formatDuplicateMessage = (attendeeId: string) => ({
	ja: `${attendeeId} は既に景品を受け取っています。`,
	en: `${attendeeId} has already collected this reward.`,
});

const RedemptionDialog = ({
	state,
	onManualEntry,
	footer,
	onClose,
}: RedemptionDialogProps) => {
	const renderContent = () => {
		if (state.status === "redeemable") {
			return {
				title: {
					ja: "景品を渡してください",
					en: "Hand the reward to the attendee",
				},
				body: [
					{
						ja: `${state.attendeeId} に景品を渡してください。`,
						en: `Hand the reward to ${state.attendeeId}.`,
					},
					{
						ja: "受け渡し完了後に「景品の受け渡しを完了する」を押してください。",
						en: "After handing off the prize, tap “Mark reward as handed off”.",
					},
				],
				primaryAction: (
					<Button
						variant="default"
						className="w-full"
						type="button"
						onClick={onClose}
					>
						Mark reward as handed off / 景品の受け渡しを完了する
					</Button>
				),
			};
		}

		if (state.status === "duplicate") {
			const message = formatDuplicateMessage(state.attendeeId);
			return {
				title: { ja: "受け渡し済みの景品です", en: "Reward already redeemed" },
				body: [
					{ ja: message.ja, en: message.en },
					{
						ja: "スタッフリーダーに連絡して状況を共有してください。",
						en: "Please notify the shift lead and share the situation.",
					},
				],
				primaryAction: (
					<Button
						variant="outline"
						className="w-full"
						type="button"
						onClick={onClose}
					>
						Close / 閉じる
					</Button>
				),
			};
		}

		return {
			title: { ja: "不正な QR コードです", en: "Invalid QR code" },
			body: [
				{
					ja: "再度読み取るか、手動入力で確認してください。",
					en: "Invalid QR code. Rescan or enter the ID manually.",
				},
			],
			primaryAction: (
				<Button
					variant="secondary"
					className="w-full"
					type="button"
					onClick={onManualEntry}
					disabled={onManualEntry === undefined}
					aria-label="手動入力に切り替える"
				>
					<span className="block">手動入力に切り替える</span>
					<span className="block text-xs text-muted-foreground">
						Switch to manual entry
					</span>
				</Button>
			),
		};
	};

	const content = renderContent();

	return (
		<Dialog open onOpenChange={(open) => (!open ? onClose?.() : undefined)}>
			<DialogContent
				aria-live="polite"
				data-testid="scan-dialog"
				data-scan-status={state.status}
				className="max-w-md space-y-4"
			>
				<DialogHeader className="text-center">
					<DialogTitle className="text-xl font-semibold">
						{content.title.ja}
					</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground">
						{content.title.en}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 text-center text-sm">
					{content.body.map((copy) => (
						<p key={copy.en}>
							<span className="block">{copy.ja}</span>
							<span className="block text-muted-foreground text-xs">
								{copy.en}
							</span>
						</p>
					))}
				</div>
				<DialogFooter className="flex flex-col space-y-2">
					{content.primaryAction}
					{footer}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export { RedemptionDialog };
export type { RedemptionDialogState };
