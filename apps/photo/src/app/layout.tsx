import type { Metadata } from "next";
import { Geist, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const googleSansCode = Google_Sans_Code({
	variable: "--font-google-sans-code",
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
		<html lang="ja">
			<body
				className={`${geistSans.variable} ${googleSansCode.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
