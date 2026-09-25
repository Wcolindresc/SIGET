import { BadRequestException, ConflictException } from '@nestjs/common';
import { CondicionEquipo, EstadoEquipo, EstadoPrestamo, EstadoReserva } from '@prisma/client';
import { PrestamosService } from './prestamos.service';

function crearPrismaMock() {
  const prisma: any = {
    equipo: { findUnique: jest.fn(), update: jest.fn() },
    reserva: { findUnique: jest.fn(), update: jest.fn() },
    prestamo: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn((a: any) => ({ id: 'pNuevo', ...a.data })), update: jest.fn(), updateMany: jest.fn() },
    devolucion: { create: jest.fn((a: any) => a.data) },
    historialEstado: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn((cb: any) => cb(prisma));
  return prisma;
}

describe('PrestamosService', () => {
  let prisma: any;
  let service: PrestamosService;
  const limite = new Date('2026-09-25T12:00:00.000Z');

  beforeEach(() => {
    prisma = crearPrismaMock();
    service = new PrestamosService(prisma);
    prisma.prestamo.findUnique.mockResolvedValue({ id: 'p1', equipoId: 'e1', estado: EstadoPrestamo.ACTIVO, fechaLimite: limite });
  });

  it('CP-16 | Partición | préstamo desde reserva APROBADA: equipo PRESTADO, reserva CONVERTIDA_PRESTAMO e historial', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.RESERVADO });
    prisma.prestamo.findFirst.mockResolvedValue(null);
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', usuarioId: 'u1', equipoId: 'e1', estado: EstadoReserva.APROBADA });

    const p = await service.create({ reservaId: 'r1', usuarioId: 'u1', equipoId: 'e1', fechaPrestamo: '2026-10-01T08:00:00Z', fechaLimite: '2026-10-02T08:00:00Z' }, 'enc1');

    expect(p.entregadoPorId).toBe('enc1');
    expect(prisma.reserva.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { estado: EstadoReserva.CONVERTIDA_PRESTAMO } });
    expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { estado: EstadoEquipo.PRESTADO } });
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({ data: expect.objectContaining({ estadoNuevo: EstadoEquipo.PRESTADO }) });
  });

  it('CP-16 | Partición (clase inválida) | reserva RECHAZADA no puede convertirse en préstamo (409)', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE });
    prisma.prestamo.findFirst.mockResolvedValue(null);
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', usuarioId: 'u1', equipoId: 'e1', estado: EstadoReserva.RECHAZADA });
    await expect(service.create({ reservaId: 'r1', usuarioId: 'u1', equipoId: 'e1', fechaPrestamo: '2026-10-01', fechaLimite: '2026-10-02' }, 'enc'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it.each<[string, string]>([
    ['A: límite un segundo antes', '2026-10-01T07:59:59Z'],
    ['B: límite igual', '2026-10-01T08:00:00Z'],
  ])('CP-17 | Valor límite | caso %s se rechaza (400)', async (_caso, fechaLimite) => {
    await expect(service.create({ usuarioId: 'u', equipoId: 'e', fechaPrestamo: '2026-10-01T08:00:00Z', fechaLimite }, 'a'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('CP-18 | Tabla de decisión | equipo con préstamo ACTIVO no puede prestarse otra vez (409)', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.PRESTADO });
    prisma.prestamo.findFirst.mockResolvedValue({ id: 'pActivo', estado: EstadoPrestamo.ACTIVO });
    await expect(service.create({ usuarioId: 'u1', equipoId: 'e1', fechaPrestamo: '2026-10-01', fechaLimite: '2026-10-02' }, 'enc'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it.each<[string, boolean]>([
    ['2026-09-25T11:59:59.000Z', false], // A: un segundo antes
    ['2026-09-25T12:00:00.000Z', false], // B: exactamente en el límite
    ['2026-09-25T12:00:01.000Z', true],  // C: un segundo después
  ])('CP-19 | Valor límite | devolución en %s => esTardia=%s', async (fecha, tardia) => {
    const dev = await service.devolver('p1', { fechaDevolucion: fecha, condicionEquipo: CondicionEquipo.BUENO }, 'enc');
    expect(dev.esTardia).toBe(tardia);
  });

  it.each<[CondicionEquipo, EstadoEquipo]>([
    [CondicionEquipo.BUENO, EstadoEquipo.DISPONIBLE],
    [CondicionEquipo.CON_DANIO, EstadoEquipo.MANTENIMIENTO],
    [CondicionEquipo.NO_FUNCIONAL, EstadoEquipo.MANTENIMIENTO],
  ])('CP-20 | Tabla de decisión | condición %s deja el equipo en %s', async (condicion, estado) => {
    await service.devolver('p1', { condicionEquipo: condicion }, 'enc');
    expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { estado } });
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({ data: expect.objectContaining({ estadoNuevo: estado }) });
  });

  it('CU-06 A1 | Transición inválida | un préstamo DEVUELTO no se puede devolver de nuevo (409)', async () => {
    prisma.prestamo.findUnique.mockResolvedValue({ id: 'p1', estado: EstadoPrestamo.DEVUELTO, fechaLimite: limite });
    await expect(service.devolver('p1', { condicionEquipo: CondicionEquipo.BUENO }, 'enc'))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
