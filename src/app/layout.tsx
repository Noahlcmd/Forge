import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Poppins, Roboto } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { cookies } from 'next/headers'
import './globals.css'

const inter   = Inter   ({ subsets: ['latin'], variable: '--font-inter'   })
const mono    = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono'  })
const poppins = Poppins ({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-poppins' })
const roboto  = Roboto  ({ subsets: ['latin'], weight: ['400','500','700'],       variable: '--font-roboto'  })

export const metadata: Metadata = {
  title:       'Forge',
  description: 'Forge — business operations platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeMode = cookies().get('forge-theme-mode')?.value ?? 'dark'
  const isDark    = themeMode !== 'light'
  const font      = cookies().get('forge-font')?.value ?? 'inter'

  return (
    <html
      lang="en"
      data-font={font}
      className={`${isDark ? 'dark' : ''} ${inter.variable} ${mono.variable} ${poppins.variable} ${roboto.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-zinc-950 text-zinc-100 antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 10000,
            style: {
              background:   'var(--card-bg, #18181b)',
              color:        'var(--text-primary, #f4f4f5)',
              border:       '1px solid var(--card-border, #3f3f46)',
              borderRadius: '12px',
              fontSize:     '13px',
              maxWidth:     '360px',
              padding:      '12px 16px',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
