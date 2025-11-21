import type { Metadata } from "next";
import "./globals.css";
import { googleSans, googleSansCode, notoSansJP } from "@/lib/font";

export const metadata: Metadata = {
	title: "まちかね祭 GDGoC Osaka",
	description: "まちかね祭 GDGoC Osaka ブースの公式サイトです",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="ja"
			className={`${googleSans.variable} ${notoSansJP.variable} ${googleSansCode.variable} antialiased`}
		>
			<body>{children}</body>
		</html>
	);
}
