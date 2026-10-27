import Link from 'next/link'
export default function Footer() {
  return <footer className="mx-auto mt-16 flex max-w-6xl flex-wrap justify-between gap-4 border-t border-white/10 px-6 py-8 text-sm text-[#C7C7F2]">
    <span>Pinvelto · internal documentation</span>
    <div className="flex gap-5"><Link href="/docs/terms">License and provenance</Link><a href="https://github.com/luxi78/vibe-annotations/issues">Project issues</a></div>
  </footer>
}
