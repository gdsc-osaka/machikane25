"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

type FeedbackVariant = "success" | "info" | "warning" | "error";

const variantStyles: Record<FeedbackVariant, string> = {
	success: "border-green-500 bg-green-50 text-green-800",
	info: "border-blue-500 bg-blue-50 text-blue-800",
	warning: "border-yellow-500 bg-yellow-50 text-yellow-800",
	error: "border-red-500 bg-red-50 text-red-800",
};

type StampFeedbackProps = {
	title: string;
	description?: ReactNode;
	variant?: FeedbackVariant;
	actions?: ReactNode;
};

export const StampFeedback = ({
	title,
	description,
	actions,
	variant = "info",
}: StampFeedbackProps) => {
	return (
		<div
			className={clsx(
				"flex flex-col gap-2 rounded-lg border px-4 py-3 shadow-sm",
				variantStyles[variant],
			)}
			role="status"
		>
			<span className="font-semibold">{title}</span>
			{description ? (
				<div className="text-sm opacity-90">{description}</div>
			) : null}
			{actions ? (
				<div className="mt-2 flex flex-wrap gap-2">{actions}</div>
			) : null}
		</div>
	);
};
