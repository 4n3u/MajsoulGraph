# MajsoulGraph

마작 관련 기능을 제공하는 웹 도구입니다.

## 실행

```bash
npm ci
npm run dev
```

개발 서버는 프론트엔드와 API 서버를 함께 실행합니다.

## 빌드

```bash
npm run build
npm start
```

## 배포

Cloudflare Workers Static Assets로 배포합니다.

```bash
npm run deploy:cloudflare
```

처음 배포할 때는 먼저 Wrangler 로그인이 필요합니다.

```bash
npx wrangler login
```

Cloudflare 대시보드에서 Git 저장소를 연결해 배포한다면 빌드 명령은 `npm run build:cloudflare`입니다. 별도 시작 명령은 필요하지 않습니다.

Cloudflare 설정은 `wrangler.jsonc`에 있습니다. `/api/*`는 Worker가 처리하고, 그 외 경로는 Vite 정적 빌드 결과를 제공합니다.

## 크레딧

- [iriscatx](https://x.com/iriscatx)
- [yuraku_urame](https://x.com/yuraku_urame)
- [AmaeKoromo_MajS](https://amae-koromo.sapk.ch/)

## Amae-Koromo API 키 설정

Node 서버는 환경 변수 `AMAE_KOROMO_API_KEY`에서 키를 읽습니다. 로컬 개발에서는 `.env.example`을 `.env`로 복사한 뒤 키를 설정하고, 사용하는 환경 변수 로딩 방식에 맞춰 불러오세요. Render에서는 서비스 설정에 `AMAE_KOROMO_API_KEY`를 비밀 환경 변수로 추가하세요.

Cloudflare Workers는 배포 전에 Wrangler secret으로 키를 저장하세요.

```bash
wrangler secret put AMAE_KOROMO_API_KEY
```
