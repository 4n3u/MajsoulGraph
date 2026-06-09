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

Render 배포 설정은 `render.yaml`에 포함되어 있습니다.

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Node: `24`
