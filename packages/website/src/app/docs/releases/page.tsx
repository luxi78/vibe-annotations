import Link from 'next/link'
import extension from '../../../../../extension/package.json'
import server from '../../../../../server/package.json'
export const metadata = { title: 'Local updates' }
export default function Updates() {
  return (
    <>
      <h1>Local updates</h1>
      <p>
        Installed source versions: extension v{extension.version}; service v
        {server.version}. Record the Git commit too: equal package versions may
        contain different reviewed changes.
      </p>
      <h2>Choose a reviewed revision</h2>
      <p>
        Obtain the next maintainer-reviewed PINVELTO_REF. The issue/23
        integration branch is not automatically merged into main. Save work and
        record <code>git rev-parse HEAD</code>. Back up your Pinvelto state
        where needed; leave other installations and configuration untouched.
      </p>
      <pre>
        <code>
          {
            'pinvelto stop\ngit fetch origin\ngit checkout PINVELTO_REF\npnpm install --frozen-lockfile\npnpm --filter pinvelto-extension build\nnpm install --global ./packages/server\npinvelto start --daemon\npinvelto status\npinvelto --version'
          }
        </code>
      </pre>
      <p>
        Local installation links to this checkout. Retain it and stop the
        service before changing source. Reload the production unpacked extension
        in chrome://extensions, reload target pages, and reconnect the agent.
        Check Feedback and attachments before resuming. No upstream release feed
        or registry polling drives updates.
      </p>
      <h2>Return to the previous revision</h2>
      <p>
        Stop Pinvelto and repeat with the recorded previous revision and its
        matching extension. Do not import upstream data or remove old agent
        entries.
      </p>
      <p>
        <Link href="/docs/troubleshooting">Troubleshooting</Link> ·{' '}
        <a href="https://github.com/luxi78/vibe-annotations">Project source</a>
      </p>
    </>
  )
}
