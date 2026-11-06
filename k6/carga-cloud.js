import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL;

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{endpoint:equipos}': ['p(95)<=800'],
    'http_req_duration{endpoint:resumen}': ['p(95)<=800'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>=0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  const r = http.post(`${BASE}/auth/login`,
    JSON.stringify({ correo: 'admin@siget.local', password: __ENV.PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } });
  check(r, { 'login correcto': (x) => x.status === 200 || x.status === 201 });
  return { token: r.json('access_token') };
}

export default function (d) {
  const h = { Authorization: `Bearer ${d.token}` };
  const a = http.get(`${BASE}/equipos`, { headers: h, tags: { endpoint: 'equipos' } });
  check(a, { 'GET /equipos 200': (r) => r.status === 200 });
  const b = http.get(`${BASE}/reportes/resumen`, { headers: h, tags: { endpoint: 'resumen' } });
  check(b, { 'GET /reportes/resumen 200': (r) => r.status === 200 });
  sleep(1);
}
