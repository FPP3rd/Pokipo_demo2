import "./globals.css";

export const metadata = {
  title: "POKIPO",
  description: "獨協大学 ポッキー価値体験スタンプラリー",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
