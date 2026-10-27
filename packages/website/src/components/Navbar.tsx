import Image from 'next/image'
import Link from 'next/link'
export default function Navbar({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  return <header className="border-b border-white/10">
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4" aria-label="Main navigation">
      <Link href="/docs" className="flex items-center gap-2 text-white no-underline">
        <Image src={variant === 'dark' ? '/pinvelto-mark-dark.svg' : '/pinvelto-mark.svg'} alt="" width={34} height={32} priority />
        <span className="font-display text-2xl font-bold">Pinvelto</span>
      </Link>
      <div className="flex flex-wrap items-center gap-5 text-sm text-[#C7C7F2]">
        <Link href="/docs/installation">Installation</Link>
        <Link href="/docs/troubleshooting">Troubleshooting</Link>
        <a href="https://github.com/luxi78/vibe-annotations" target="_blank" rel="noopener noreferrer">Project source</a>
      </div>
    </nav>
  </header>
}
