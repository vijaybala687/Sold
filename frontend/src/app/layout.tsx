import "./globals.css";

export const metadata = {
  title: "SOLD | IPL Auction",
  description: "Real-time IPL Mega Auction Simulator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}