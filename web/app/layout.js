import './globals.css';

export const metadata = {
  title: 'Job Helper',
  description: 'AI-powered job application assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
