export type ServerRegionId = "en-kr" | "jp" | "cn" | "auth";
export type ServerFetchMode = "cors" | "no-cors";

export type ServerEndpoint = {
  id: string;
  name: string;
  host: string;
  cloud: string;
  location: string;
  httpUrl: string | null;
  fetchMode: ServerFetchMode;
  measurable: boolean;
};

export type ServerRegion = {
  id: ServerRegionId;
  label: string;
  endpoints: ServerEndpoint[];
};

const ROUTES_PATH = "/api/clientgate/routes";

export const SERVER_REGIONS: ServerRegion[] = [
  {
    id: "en-kr",
    label: "EN/KR",
    endpoints: [
      {
        id: "en-edge",
        name: "EN/KR 기본 게이트웨이",
        host: "engs.mahjongsoul.com",
        cloud: "Cloudflare → Alibaba Cloud",
        location: "글로벌 엣지",
        httpUrl: `https://engs.mahjongsoul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      },
      {
        id: "en-origin",
        name: "EN/KR 직결 백업",
        host: "engsbk.mahjongsoul.com",
        cloud: "Alibaba Cloud ALB",
        location: "미국 동부",
        httpUrl: `https://engsbk.mahjongsoul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      }
    ]
  },
  {
    id: "jp",
    label: "JP",
    endpoints: [
      {
        id: "jp-edge",
        name: "JP 기본 게이트웨이",
        host: "jpgs.mahjongsoul.com",
        cloud: "Cloudflare → Alibaba Cloud",
        location: "글로벌 엣지",
        httpUrl: `https://jpgs.mahjongsoul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      },
      {
        id: "jp-origin",
        name: "JP 직결 백업",
        host: "jpgsbk.mahjongsoul.com",
        cloud: "Alibaba Cloud ALB",
        location: "도쿄",
        httpUrl: `https://jpgsbk.mahjongsoul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      }
    ]
  },
  {
    id: "cn",
    label: "CN",
    endpoints: [
      {
        id: "cn-direct",
        name: "CN 본토 직결",
        host: "203.107.63.200",
        cloud: "Alibaba Cloud",
        location: "상하이",
        httpUrl: null,
        fetchMode: "cors",
        measurable: false
      },
      {
        id: "cn-singapore",
        name: "CN 해외 라우트 · 싱가포르",
        host: "route-2.maj-soul.com",
        cloud: "Alibaba Cloud DDoS",
        location: "싱가포르",
        httpUrl: `https://route-2.maj-soul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      },
      {
        id: "cn-hongkong",
        name: "CN 해외 라우트 · 홍콩",
        host: "route-3.maj-soul.com",
        cloud: "Huawei Cloud",
        location: "홍콩",
        httpUrl: `https://route-3.maj-soul.com:8443${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      },
      {
        id: "cn-cdn-primary",
        name: "CN CDN 라우트 1",
        host: "route-4.maj-soul.com",
        cloud: "Alibaba Cloud CDN",
        location: "글로벌 엣지",
        httpUrl: `https://route-4.maj-soul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      },
      {
        id: "cn-default",
        name: "CN 기본 게이트웨이",
        host: "route-5.maj-soul.com",
        cloud: "CDS Global Cloud",
        location: "타이베이",
        httpUrl: `https://route-5.maj-soul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      },
      {
        id: "cn-cdn-secondary",
        name: "CN CDN 라우트 2",
        host: "route-6.maj-soul.com",
        cloud: "MCN CDN",
        location: "싱가포르 / 홍콩",
        httpUrl: `https://route-6.maj-soul.com${ROUTES_PATH}`,
        fetchMode: "cors",
        measurable: true
      }
    ]
  },
  {
    id: "auth",
    label: "인증",
    endpoints: [
      {
        id: "auth-passport",
        name: "계정 패스포트 · HTTPS",
        host: "passport.mahjongsoul.com",
        cloud: "Cloudflare",
        location: "글로벌 엣지",
        httpUrl: "https://passport.mahjongsoul.com/",
        fetchMode: "no-cors",
        measurable: true
      },
      {
        id: "auth-passport-tls",
        name: "계정 패스포트 · TLS",
        host: "passport.mahjongsoul.com",
        cloud: "Cloudflare",
        location: "글로벌 엣지",
        httpUrl: null,
        fetchMode: "cors",
        measurable: false
      },
      {
        id: "auth-en",
        name: "EN 로그인",
        host: "en-sdk-api.yostarplat.com",
        cloud: "Akamai",
        location: "글로벌 엣지",
        httpUrl: "https://en-sdk-api.yostarplat.com/",
        fetchMode: "no-cors",
        measurable: true
      },
      {
        id: "auth-jp",
        name: "JP/KR 로그인",
        host: "jp-sdk-api.yostarplat.com",
        cloud: "Akamai",
        location: "글로벌 엣지",
        httpUrl: "https://jp-sdk-api.yostarplat.com/",
        fetchMode: "no-cors",
        measurable: true
      }
    ]
  }
];

export const ALL_SERVER_ENDPOINTS = SERVER_REGIONS.flatMap((region) => region.endpoints);
