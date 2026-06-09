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
