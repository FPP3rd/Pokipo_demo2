import "./globals.css";
import PokipoExtraRewardNotice from "../components/PokipoExtraRewardNotice";

export const metadata = {
  title: "POKIPO",
  description: "獨協大学 ポッキー価値体験スタンプラリー",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <PokipoExtraRewardNotice />
        {children}
      </body>
    </html>
  );
}