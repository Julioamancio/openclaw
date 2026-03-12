import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controlla Fiscal",
  description: "SaaS para gestão contábil, fiscal e obrigações acessórias.",
  applicationName: "Controlla Fiscal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
