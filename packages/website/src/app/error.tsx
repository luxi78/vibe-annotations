'use client'
import Link from 'next/link'
export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Documentation could not load</h1>
      <p className="my-6">
        Try the page again. If it keeps failing, report the reviewed commit and
        reproduction steps to the project.
      </p>
      <button
        className="rounded-md bg-[#0754FF] px-4 py-2 text-white"
        onClick={reset}
      >
        Try again
      </button>
      <p className="mt-6">
        <Link href="/docs">Documentation home</Link> ·{' '}
        <a href="https://github.com/luxi78/vibe-annotations/issues">
          Project issues
        </a>
      </p>
    </main>
  )
}
