export default function BoothLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <div className="h-screen w-full overflow-hidden">{children}</div>;
}
