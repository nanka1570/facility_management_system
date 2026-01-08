import './globals.css'

export const metadata = {
    title: '施設管理システム',
    description: '汎用施設管理システム',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    )
}