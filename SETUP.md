# T4XPro PWA 배포 가이드

## 받은 파일 6개

| 파일 | 용도 |
|---|---|
| `index.html` | 수정된 메인 파일 (manifest 링크 + iOS 메타태그 + SW 등록 추가) |
| `manifest.json` | PWA 메타데이터 (앱 이름, 아이콘, 색상) |
| `sw.js` | Service Worker (오프라인 캐싱) |
| `icon-192.png` | 표준 PWA 아이콘 |
| `icon-512.png` | 큰 화면용 PWA 아이콘 |
| `apple-touch-icon.png` | iOS 홈화면 추가용 (180×180) |

---

## 배포 단계

### 1. 모든 파일을 GitHub 저장소 루트에 업로드

t4xpro.com이 제공되는 GitHub Pages 저장소에 6개 파일을 모두 같은 폴더(루트)에 둡니다. 기존 `index.html`은 새 버전으로 교체.

```
your-repo/
├── index.html           ← 교체
├── manifest.json        ← 신규
├── sw.js                ← 신규
├── icon-192.png         ← 신규
├── icon-512.png         ← 신규
├── apple-touch-icon.png ← 신규
└── (기존 다른 파일들은 그대로)
```

### 2. Push 후 1~2분 기다리기

GitHub Pages 빌드가 완료되면 t4xpro.com에 반영됩니다.

### 3. iPhone에서 홈 화면에 추가

1. Safari로 t4xpro.com 접속
2. 하단 공유 버튼(▢↑) 탭
3. "홈 화면에 추가" 선택
4. 이름이 "T4XPro"로 뜨는지 확인 후 추가
5. 홈 화면에 T4X 아이콘 등장

이제 그 아이콘을 누르면 **전체화면**으로 켜지고, Safari 주소창 없이 진짜 앱처럼 작동합니다.

### 4. Android에서 홈 화면에 추가

Chrome으로 접속하면 자동으로 "홈 화면에 추가" 배너가 뜨거나, 메뉴(⋮) → "앱 설치"에서 가능.

---

## 작동 확인

홈 화면에 추가한 후:

- ✅ **전체화면 실행**: Safari 주소창이 안 보임
- ✅ **오프라인 실행**: 비행기 모드에서도 앱이 켜짐 (로컬 데이터로 문제 풀이 가능). Supabase 동기화/Gemini AI는 당연히 네트워크 필요
- ✅ **앱 스위처에 별도 표시**: iOS 앱 스위처에서 독립 앱으로 보임

---

## 앱 업데이트하는 방법

`index.html`이나 다른 파일을 수정해서 배포할 때:

**옵션 A — 자동 (대부분 1~2분 안에 반영됨)**
그냥 GitHub에 push하면 됩니다. Service Worker가 `index.html`을 network-first로 가져오기 때문에, 온라인이면 자동으로 새 버전을 받음.

**옵션 B — 강제 캐시 갱신 (큰 업데이트 시)**
`sw.js` 파일에서 다음 줄을 찾아서:
```javascript
const CACHE_VERSION = 'v1';
```
`v1` → `v2` → `v3` 식으로 숫자만 올려서 push. 다음 방문 시 옛 캐시가 모두 삭제되고 새로 받습니다.

---

## 캐싱 전략 (참고)

`sw.js`가 처리하는 방식:

| 요청 종류 | 전략 | 이유 |
|---|---|---|
| `index.html`, 네비게이션 | network-first | 온라인이면 항상 최신 앱, 오프라인이면 캐시 |
| Supabase REST API | **network-only** | 개인 데이터, 절대 캐시 안 함 |
| Gemini API | **network-only** | 항상 최신 응답 필요 |
| Google Fonts | cache-first | 거의 안 변함, 빠른 로딩 |
| jsdelivr CDN (Supabase JS) | cache-first | 버전 고정, 빠른 로딩 |
| 아이콘, manifest | cache-first | 정적 자원 |

---

## 디버깅 (혹시 문제 있을 때)

### iPhone Safari에서 확인:
- 설정 → Safari → 고급 → 웹 인스펙터 켜기
- Mac Safari → 개발자 메뉴에서 iPhone 선택
- 콘솔에서 `[SW] registered, scope: ...` 메시지 확인

### Chrome에서 확인:
- DevTools → Application 탭 → Service Workers (등록 여부 확인)
- Application 탭 → Manifest (아이콘, 색상 미리보기)
- Lighthouse 탭 → "Progressive Web App" 카테고리 감사 실행

### 자주 묻는 문제

**Q: 홈 화면 아이콘이 흐릿함**
→ `apple-touch-icon.png`가 루트에 제대로 있는지 확인. iOS는 캐시가 강해서 한 번 잘못 받으면 바뀐 아이콘 안 보임. 홈 화면에서 삭제 후 다시 추가.

**Q: 업데이트가 반영 안 됨**
→ `sw.js`의 `CACHE_VERSION` 올린 후 push. 또는 iPhone에서 앱 삭제 후 재추가.

**Q: 오프라인에서 앱이 안 켜짐**
→ 한 번은 온라인 상태로 접속해야 SW가 설치됨. 첫 방문 후부터 오프라인 작동.

---

## 파일 구조 한눈에 보기

배포 후 t4xpro.com이 다음과 같이 동작:

```
사용자가 t4xpro.com 첫 방문
  ↓
index.html 로드 + service worker 등록
  ↓
SW가 백그라운드에서 앱 셸 캐싱 (index.html, manifest, 아이콘)
  ↓
"홈 화면에 추가" → T4X 아이콘 생성
  ↓
다음부터는 아이콘 탭 → 전체화면 실행 → 오프라인도 OK
```

수정·확장 필요하면 알려주세요.
