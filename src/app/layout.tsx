import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecurControl Cloud",
  description: "Control de Obras, Gastos y HH en Tiempo Real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
