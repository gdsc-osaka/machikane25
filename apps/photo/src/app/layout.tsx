import type { Metadata } from "next";
import { Google_Sans_Code, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { googleSans } from "@/lib/font";

const googleSansCode = Google_Sans_Code({
	variable: "--font-google-sans-code",
	subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
	variable: "--font-noto-sans-jp",
	subsets: ["latin"],
});

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
