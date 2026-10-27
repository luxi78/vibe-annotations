import * as p from '@clack/prompts';
export const EXTENSION_GUIDE =
  'https://github.com/luxi78/vibe-annotations/blob/main/packages/extension/README.md';
export async function runExtensionStep() {
  p.log.info(
    `Build the repository extension with pnpm --filter pinvelto-extension build, then load packages/extension/.output/chrome-mv3 from chrome://extensions.\n${EXTENSION_GUIDE}`
  );
  return { status: 'local-guidance' };
}
