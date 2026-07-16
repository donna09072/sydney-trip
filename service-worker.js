// Sydney 여행 일정 - Service Worker
// 캐시 버전을 올리면 사용자에게 업데이트가 배포됩니다. (README 참고)
const CACHE_VERSION = 'sydney-trip-v15';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('sydney-trip-') && key !== CORE_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 전략:
// - 앱 셸(HTML/manifest/아이콘): 캐시 우선, 실패 시 네트워크
// - 그 외 요청(폰트 등 외부 리소스): 네트워크 우선, 실패 시 캐시 (오프라인 폴백)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isCoreAsset = url.origin === self.location.origin;

  if (isCoreAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CORE_CACHE).then((cache) => cache.put(req, resClone));
            return res;
          })
          .catch(() => caches.match('./index.html'));
      })
    );
  } else {
    // 외부 리소스(폰트 CSS/woff 등): 네트워크 우선, 성공 시 캐시에 저장해두고
    // 오프라인일 땐 캐시된 버전을 사용 (완전 오프라인에서도 폰트가 깨지지 않도록)
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
