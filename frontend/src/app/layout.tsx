import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Beacon',
    description: 'AI-Powered Business Requirements Generator — transform conversations into professional BRDs',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
                {children}
            </body>
        </html>
    );
}
