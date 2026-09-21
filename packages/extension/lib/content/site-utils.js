// Utilities for discovering, disambiguating, and formatting site origins in View all

export function getAvailableSiteOrigins(allAnnotations, currentOrigin, keptEmptyOrigin = null) {
  const eligible = (allAnnotations || []).filter(a => a && a.status !== 'resolved');
  const origins = new Set();

  for (const a of eligible) {
    if (!a.url) continue;
    try {
      const u = new URL(a.url);
      origins.add(u.origin);
    } catch {
      // ignore invalid URLs
    }
  }

  if (currentOrigin) {
    origins.add(currentOrigin);
  }

  if (keptEmptyOrigin) {
    origins.add(keptEmptyOrigin);
  }

  return Array.from(origins);
}

export function formatSiteLabel(origin, allOrigins = []) {
  try {
    const u = new URL(origin);
    const host = u.host; // includes port if non-default, e.g. "localhost:3000"
    // Disambiguate if another origin shares the exact same host (e.g. http: vs https:)
    const hasHostCollision = (allOrigins || []).some(o => {
      if (o === origin) return false;
      try {
        return new URL(o).host === host;
      } catch {
        return false;
      }
    });

    if (hasHostCollision) {
      return origin;
    }
    return host;
  } catch {
    return origin;
  }
}

export function formatSiteOptionText(origin, currentOrigin, allOrigins = []) {
  const label = formatSiteLabel(origin, allOrigins);
  if (origin === currentOrigin) {
    return `${label} (current site)`;
  }
  return label;
}
