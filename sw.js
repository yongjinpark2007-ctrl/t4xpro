/**
 * T4XPro Service Worker
 *
 * 캐싱 전략:
 *   - HTML (index.html): network-first → 새 버전이 있으면 가져오고, 오프라인이면 캐시 사용
 *   - API 호출 (Supabase, Gemini): network-only → 절대 캐시 안 함 (개인 데이터, 항상 최신 필요)
 *   - 정적 자원 (Google Fonts, Supabase CDN): cache-first → 빠른 로딩
 *
 * 업데이트 방법:
 *   배포 후 새 버전을 강제 적용하려면 아래 CACHE_VERSION 숫자만 올려주세요.
 *   (예: 'v1' → 'v2'). 다음 방문 시 자동으로 새 캐시가 만들어집니다.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `t4xpro-${CACHE_VERSION}`;

// 앱 셸 - 오프라인에서도 앱이 켜지도록 미리 받아둘 파일
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

// 항상 네트워크로만 가야 하는 호스트 (캐시 절대 안 함)
const NETWORK_ONLY_HOSTS = [
  'supabase.co',                   // Supabase REST API
  'generativelanguage.googleapis.com', // Gemini API
];

// 캐시 우선으로 다뤄도 되는 호스트 (CDN, 폰트)
const CACHE_FIRST_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
];


// ---------- INSTALL: 앱 셸 미리 캐싱 ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] precache failed:', err))
  );
});


// ---------- ACTIVATE: 옛날 캐시 삭제 ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});


// ---------- FETCH: 요청 가로채기 ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POST 등 GET 이외 요청은 SW가 건드리지 않음
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) API 호출은 무조건 네트워크로만 (캐시 X)
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h))) {
    return; // 기본 동작(네트워크) 그대로
  }

  // 2) HTML 문서 (앱 진입점) - network-first
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req));
    return;
  }

  // 3) Google Fonts, jsDelivr CDN - cache-first
  if (CACHE_FIRST_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 4) 같은 origin의 정적 자원 (icon, manifest 등) - cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 그 외는 그냥 네트워크
});


// network-first: 네트워크 시도 → 실패하면 캐시
async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    // 성공 시 캐시 업데이트 (HTML도 오프라인용으로 보관)
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // index.html로 fallback (SPA이므로 어떤 경로든 메인이 처리)
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
    throw err;
  }
}


// cache-first: 캐시 있으면 그걸로 → 없으면 네트워크
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) {
    // 백그라운드에서 조용히 업데이트 (다음 방문 때 더 신선한 버전 사용)
    fetch(req).then((fresh) => {
      if (fresh && fresh.status === 200) {
        caches.open(CACHE_NAME).then(c => c.put(req, fresh).catch(() => {}));
      }
    }).catch(() => {});
    return cached;
  }
  // 캐시에 없으면 네트워크 → 성공하면 저장
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}
