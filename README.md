# 작혼 그래프

작혼 유저 데이터를 기반으로 포인트 추이 그래프, 사마 스타일 분석, 손패 이미지 생성, 패보 주소 변환을 제공하는 웹 도구입니다.

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

## 참고

`.streamlit/`과 `docs/`는 참고용 자료이며 저장소에는 포함하지 않습니다.
