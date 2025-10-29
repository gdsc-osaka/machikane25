import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getFirebaseAuth } from "@/firebase"; // Firebase authインスタンスをインポート
import type { StaffGateState } from "../types";

type StaffAccessGateProps = {
	state: StaffGateState;
};

const StaffAccessGate = ({ state }: StaffAccessGateProps) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleLogin = async () => {
		setLoading(true);
		setError(null);
		try {
			const authInstance = getFirebaseAuth();
			await signInWithEmailAndPassword(authInstance, email, password);
			// ログイン成功後、ページがリロードされ、requireStaffが再度実行される
			window.location.reload();
		} catch (e) {
			setError(
				"ログインに失敗しました。メールアドレスとパスワードを確認してください。",
			);
			console.error("Login error:", e);
		} finally {
			console.log(state.status);
			setLoading(false);
		}
	};

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
					<CardContent className="space-y-4">
						{error && <p className="text-destructive text-sm">{error}</p>}
						<div className="grid w-full items-center gap-1.5">
							<Label htmlFor="email">メールアドレス</Label>
							<Input
								type="email"
								id="email"
								placeholder="staff@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={loading}
							/>
						</div>
						<div className="grid w-full items-center gap-1.5">
							<Label htmlFor="password">パスワード</Label>
							<Input
								type="password"
								id="password"
								placeholder="パスワード"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading}
							/>
						</div>
					</CardContent>
					<CardFooter className="flex justify-end">
						<Button onClick={handleLogin} disabled={loading}>
							{loading ? <Spinner className="mr-2 size-4" /> : null}
							サインイン
						</Button>
					</CardFooter>
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
