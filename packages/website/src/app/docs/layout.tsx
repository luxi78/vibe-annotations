import type { Metadata } from 'next'
import Link from 'next/link'
import extension from '../../../../extension/package.json'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
export const metadata: Metadata = {
  title: { template: '%s — Pinvelto', default: 'Pinvelto documentation' },
}
const navigation = [
  ['/docs', 'Overview'],
  ['/docs/installation', 'Installation'],
  ['/docs/mcp-setup', 'MCP setup'],
  ['/docs/workflows', 'Feedback and review'],
  ['/docs/workflows/design-edits', 'Design previews'],
  ['/docs/workflows/screenshots', 'Screenshots and images'],
  ['/docs/workflows/sharing', 'Exports and import'],
  ['/docs/workflows/variants', 'Variants'],
  ['/docs/workflows/watch-mode', 'Watch mode'],
  ['/docs/workflows/agents', 'Agent-created Feedback'],
  ['/docs/architecture', 'Architecture'],
  ['/docs/troubleshooting', 'Troubleshooting'],
  ['/docs/releases', 'Local updates'],
  ['/docs/terms', 'License and provenance'],
]
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-ink text-white">
      <Navbar />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[220px_minmax(0,680px)] lg:gap-16">
        <nav
          aria-label="Documentation"
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <details open>
            <summary className="mb-4 cursor-pointer font-medium text-white">
              Documentation
            </summary>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 lg:block lg:space-y-1">
              {navigation.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block rounded-md py-1.5 text-sm text-[#C7C7F2] hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <p className="mt-6 text-sm text-[#C7C7F2]">
            Local extension v{extension.version}
          </p>
        </nav>
        <article className="prose prose-invert min-w-0 max-w-none prose-headings:font-display prose-a:text-[#8BB0FF] prose-a:underline prose-code:break-words prose-code:before:content-none prose-code:after:content-none prose-pre:overflow-x-auto prose-pre:border prose-pre:border-white/10 prose-pre:bg-ink-2">
          {children}
        </article>
      </div>
      <Footer />
    </div>
  )
}
