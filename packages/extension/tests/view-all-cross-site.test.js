import test from 'node:test';
import assert from 'node:assert';

// Mock chrome storage and runtime
const mockStorage = { annotations: [] };
globalThis.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        const result = {};
        for (const k of keys) {
          result[k] = mockStorage[k];
        }
        return result;
      },
      set: async (items) => {
        Object.assign(mockStorage, items);
      }
    }
  },
  runtime: {
    getURL: (path) => `chrome-extension://mock/${path}`,
    sendMessage: async () => ({ success: true }),
    getManifest: () => ({ version: '2.0.2' })
  }
};

globalThis.window = {
  location: {
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    href: 'http://localhost:3000/page1'
  }
};

const { default: VibeAPI } = await import('../lib/content/api-bridge.js');

test('VibeAPI cross-site annotation loading', async (t) => {
  t.beforeEach(() => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Site 1 note', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page2', comment: 'Site 1 resolved', status: 'resolved' },
      { id: '3', url: 'http://localhost:5173/about', comment: 'Site 2 note', status: 'open' },
      { id: '4', url: 'https://example.com/app', comment: 'Site 3 note', status: 'open' }
    ];
  });

  await t.test('loadAllStoredAnnotations returns all annotations across all sites', async () => {
    assert.strictEqual(typeof VibeAPI.loadAllStoredAnnotations, 'function', 'loadAllStoredAnnotations must be exported');
    const all = await VibeAPI.loadAllStoredAnnotations();
    assert.strictEqual(all.length, 4);
  });

  await t.test('loadProjectAnnotations accepts targetOrigin to filter specific site', async () => {
    const site2 = await VibeAPI.loadProjectAnnotations('http://localhost:5173');
    assert.strictEqual(site2.length, 1);
    assert.strictEqual(site2[0].id, '3');

    // Default targetOrigin is current site window.location.origin
    const site1 = await VibeAPI.loadProjectAnnotations();
    assert.strictEqual(site1.length, 2);
    assert.deepStrictEqual(site1.map(a => a.id), ['1', '2']);
  });
});

test('Site discovery and disambiguation helpers', async (t) => {
  const {
    getAvailableSiteOrigins,
    formatSiteLabel,
    formatSiteOptionText
  } = await import('../lib/content/site-utils.js');

  await t.test('getAvailableSiteOrigins includes sites with eligible annotations and always includes currentOrigin even when empty', () => {
    const currentOrigin = 'http://localhost:3000';
    const annotations = [
      { id: '1', url: 'http://localhost:5173/page', status: 'open' },
      { id: '2', url: 'http://localhost:8080/page', status: 'resolved' }, // resolved excluded
      { id: '3', url: 'https://example.com/app', status: 'open' }
    ];

    const sites = getAvailableSiteOrigins(annotations, currentOrigin);
    // http://localhost:3000 has no annotations, but must be included!
    assert.ok(sites.includes('http://localhost:3000'), 'Current origin must always be included');
    assert.ok(sites.includes('http://localhost:5173'), 'Site with open annotation must be included');
    assert.ok(sites.includes('https://example.com'), 'Site with open annotation must be included');
    assert.ok(!sites.includes('http://localhost:8080'), 'Site with only resolved annotations must be excluded');
  });

  await t.test('getAvailableSiteOrigins retains keptEmptyOrigin if specified', () => {
    const currentOrigin = 'http://localhost:3000';
    const annotations = [
      { id: '1', url: 'http://localhost:3000/page', status: 'open' }
    ];

    // keptEmptyOrigin is kept visible after last item deleted
    const sites = getAvailableSiteOrigins(annotations, currentOrigin, 'http://localhost:5173');
    assert.ok(sites.includes('http://localhost:5173'), 'keptEmptyOrigin must be included');
    assert.ok(sites.includes('http://localhost:3000'));
  });

  await t.test('formatSiteLabel distinguishes different ports on same host', () => {
    const origins = ['http://localhost:3000', 'http://localhost:5173'];
    assert.strictEqual(formatSiteLabel('http://localhost:3000', origins), 'localhost:3000');
    assert.strictEqual(formatSiteLabel('http://localhost:5173', origins), 'localhost:5173');
  });

  await t.test('formatSiteLabel disambiguates conflicting schemes on same host', () => {
    const origins = ['http://example.com', 'https://example.com'];
    assert.strictEqual(formatSiteLabel('http://example.com', origins), 'http://example.com');
    assert.strictEqual(formatSiteLabel('https://example.com', origins), 'https://example.com');
  });

  await t.test('formatSiteOptionText marks current site with accessible label', () => {
    const currentOrigin = 'http://localhost:3000';
    const origins = ['http://localhost:3000', 'http://localhost:5173'];
    assert.strictEqual(
      formatSiteOptionText('http://localhost:3000', currentOrigin, origins),
      'localhost:3000 (current site)'
    );
    assert.strictEqual(
      formatSiteOptionText('http://localhost:5173', currentOrigin, origins),
      'localhost:5173'
    );
  });
});

