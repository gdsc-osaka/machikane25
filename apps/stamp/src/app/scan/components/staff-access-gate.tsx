import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { StaffGateState } from "../types";

type StaffAccessGateProps = {
	state: StaffGateState;
};

const StaffAccessGate = ({ state }: StaffAccessGateProps) => {
	if (state.status === "loading") {
		return (
			<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 py-16">
				<Spinner className="size-6 text-primary" />
				<p className="text-sm text-muted-foreground">
					職員認証の状態を確認しています…
				</p>
			</main>
		);
	}

	if (state.status === "needs-auth") {
		return (
			<main
				data-testid="staff-login-gate"
				className="bg-background text-foreground mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-16"
			>
				<Card className="w-full border-primary/20 shadow-md">
					<CardHeader className="text-center text-xl font-semibold">
						スタッフアカウントでサインインしてください
					</CardHeader>
					<CardContent className="space-y-3 text-center text-sm">
						<p>
							特設スタッフログインページからメールアドレスとパスワードでサインインします。
						</p>
						<p className="text-muted-foreground text-xs">
							Please sign in with your staff email to access the redemption
							console.
						</p>
					</CardContent>
				</Card>
			</main>
		);
	}

	if (state.status === "error") {
		throw state.error;
	}

	return null;
};

export { StaffAccessGate };
