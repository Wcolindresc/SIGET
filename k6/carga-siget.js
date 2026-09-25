// k6/carga-siget.js  —  CP-30: valida RNF-01 (rendimiento) y RNF-07 (disponibilidad) sobre el ambiente cloud
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const MAX_VU = Number(__ENV.MAX_VU || 50);       // RNF-01: hasta 50 usuarios virtuales
const MESETA = __ENV.MESETA || '4m';              // rampa 1 min + meseta 4 min + bajada 30 s (>= 5 min)

export const options = {
  stages: [
    { duration: '1m', target: MAX_VU },
    { duration: MESETA, target: MAX_VU },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{endpoint:equipos}': ['p(95)<=800'],   // RNF-01
    'http_req_duration{endpoint:resumen}': ['p(95)<=800'],   // RNF-01
    http_req_failed: ['rate<0.01'],                          // RNF-01: error < 1 %
    checks: ['rate>=0.99'],                                  // RNF-07: >= 99 % de respuestas exitosas
  },
};

// Se inicia sesión UNA sola vez; el token se comparte con todos los VUs.
export function setup() {
  const r = http.post(`${BASE}/auth/login`,
    JSON.stringify({ correo: __ENV.USER || 'admin@siget.local', password: __ENV.PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } });
  if (r.status !== 201) throw new Error(`Login falló (${r.status}); revise BASE_URL y PASSWORD`);
  return { token: r.json('access_token') };
}

export default function (data) {
  const params = (endpoint) => ({ headers: { Authorization: `Bearer ${data.token}` }, tags: { endpoint } });
  group('GET /equipos', () => {
    const r = http.get(`${BASE}/equipos`, params('equipos'));
    check(r, { 'equipos 200': (x) => x.status === 200 });
  });
  group('GET /reportes/resumen', () => {
    const r = http.get(`${BASE}/reportes/resumen`, params('resumen'));
    check(r, { 'resumen 200': (x) => x.status === 200 });
  });
  sleep(1);
}
