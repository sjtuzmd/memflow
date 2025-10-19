import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MemFlow - Create Beautiful Photo Albums',
  description: 'Transform your photos into stunning printable photo albums with AI-powered design',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
