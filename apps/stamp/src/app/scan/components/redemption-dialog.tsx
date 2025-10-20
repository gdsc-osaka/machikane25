import type { ReactNode } from "react";

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

const RedemptionDialog = ({
	state,
	footer,
}: {
	state: RedemptionDialogState;
	footer?: ReactNode;
}) => (
	<div data-testid="scan-dialog" data-scan-status={state.status}>
		{footer}
	</div>
);

export { RedemptionDialog };
export type { RedemptionDialogState };
