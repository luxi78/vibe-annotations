'use client'
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
return <html lang="en"><body><main><h1>Pinvelto documentation could not load</h1><button onClick={reset}>Try again</button><p><a href="/docs">Documentation home</a> · <a href="https://github.com/luxi78/vibe-annotations/issues">Project issues</a></p></main></body></html>
}
