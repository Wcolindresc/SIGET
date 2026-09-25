// k6/concurrencia-reservas.js  —  Complemento de CP-10 / RF-05: reservas simultáneas del mismo equipo y rango
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
export const options = { vus: 1, iterations: 1 };

export default function () {
  const login = http.post(`${BASE}/auth/login`,
    JSON.stringify({ correo: 'usuario@siget.local', password: __ENV.PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } });
  const token = login.json('access_token');

  // Fechas lejanas y aleatorias para no chocar con datos existentes
  const inicio = new Date(Date.now() + (200 + Math.floor(Math.random() * 500)) * 86400000);
  const fin = new Date(inicio.getTime() + 2 * 3600000);
  const body = JSON.stringify({
    equipoId: __ENV.EQUIPO_ID, fechaInicio: inicio.toISOString(),
    fechaFin: fin.toISOString(), motivo: 'Prueba de concurrencia k6',
  });
  const params = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };

  // 10 solicitudes idénticas enviadas en paralelo
  const respuestas = http.batch(Array.from({ length: 10 }, () => ['POST', `${BASE}/reservas`, body, params]));
  const creadas = respuestas.filter((r) => r.status === 201).length;
  console.log(`Reservas creadas: ${creadas} de 10 (esperado: 1)`);
  check(creadas, { 'RF-05: solo 1 reserva creada': (n) => n === 1 });
}
