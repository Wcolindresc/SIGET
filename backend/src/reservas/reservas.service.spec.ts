import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EstadoEquipo, EstadoReserva, Rol } from '@prisma/client';
import { ReservasService } from './reservas.service';

// Mock de Prisma: $transaction ejecuta el callback con el mismo mock
function crearPrismaMock() {
  const prisma: any = {
    equipo: { findUnique: jest.fn(), update: jest.fn() },
    reserva: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn((a: any) => ({ id: a.where.id, ...a.data })) },
    historialEstado: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn((cb: any) => cb(prisma));
  return prisma;
}

const futuro = (dias: number, horas = 0) =>
  new Date(Date.now() + dias * 86400000 + horas * 3600000).toISOString();

describe('ReservasService', () => {
  let prisma: any;
  let service: ReservasService;

  beforeEach(() => {
    prisma = crearPrismaMock();
    service = new ReservasService(prisma);
  });

  it('CP-08 | Partición | crea reserva PENDIENTE para equipo DISPONIBLE sin traslape', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE });
    prisma.reserva.findFirst.mockResolvedValue(null);
    prisma.reserva.create.mockResolvedValue({ id: 'r1', estado: EstadoReserva.PENDIENTE });

    const r = await service.create('u1', { equipoId: 'e1', fechaInicio: futuro(10), fechaFin: futuro(10, 2), motivo: 'Clase' });

    expect(r.estado).toBe(EstadoReserva.PENDIENTE);
    expect(prisma.equipo.update).not.toHaveBeenCalled(); // el equipo conserva su estado hasta la aprobación
  });

  it.each<[string, number]>([
    ['A: fin un segundo antes del inicio', -1000],
    ['B: fin igual al inicio', 0],
  ])('CP-09 | Valor límite | caso %s se rechaza (400)', async (_caso, deltaMs) => {
    const inicio = new Date(Date.now() + 10 * 86400000);
    const fin = new Date(inicio.getTime() + deltaMs);
    await expect(service.create('u1', { equipoId: 'e1', fechaInicio: inicio.toISOString(), fechaFin: fin.toISOString(), motivo: 'x' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('CP-09 | Valor límite | caso C: fin un segundo después del inicio supera la regla', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE });
    prisma.reserva.findFirst.mockResolvedValue(null);
    prisma.reserva.create.mockResolvedValue({ id: 'r1', estado: EstadoReserva.PENDIENTE });
    const inicio = new Date(Date.now() + 10 * 86400000);
    await expect(service.create('u1', { equipoId: 'e1', fechaInicio: inicio.toISOString(), fechaFin: new Date(inicio.getTime() + 1000).toISOString(), motivo: 'x' }))
      .resolves.toMatchObject({ estado: EstadoReserva.PENDIENTE });
  });

  it('CP-10 | Tabla de decisión | reserva con traslape de fechas se rechaza (409)', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE });
    prisma.reserva.findFirst.mockResolvedValue({ id: 'rExistente' });
    await expect(service.create('u1', { equipoId: 'e1', fechaInicio: futuro(10), fechaFin: futuro(10, 2), motivo: 'x' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it.each([EstadoEquipo.RESERVADO, EstadoEquipo.PRESTADO, EstadoEquipo.MANTENIMIENTO, EstadoEquipo.BAJA])(
    'CP-11 | Tabla de decisión | equipo en estado %s no se puede reservar (409)',
    async (estado) => {
      prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado });
      await expect(service.create('u1', { equipoId: 'e1', fechaInicio: futuro(10), fechaFin: futuro(10, 2), motivo: 'x' }))
        .rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('CP-12 | Transición | aprobar PENDIENTE -> APROBADA y equipo DISPONIBLE -> RESERVADO con historial', async () => {
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', equipoId: 'e1', estado: EstadoReserva.PENDIENTE });
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE });

    const r = await service.approve('r1', 'enc1');

    expect(r.estado).toBe(EstadoReserva.APROBADA);
    expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { estado: EstadoEquipo.RESERVADO } });
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      estadoAnterior: EstadoEquipo.DISPONIBLE, estadoNuevo: EstadoEquipo.RESERVADO, usuarioId: 'enc1' }) });
  });

  it('CP-13 | Transición | rechazar PENDIENTE -> RECHAZADA sin cambiar el equipo', async () => {
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', equipoId: 'e1', estado: EstadoReserva.PENDIENTE });
    const r = await service.reject('r1', 'enc1', 'No disponible por política interna');
    expect(r.estado).toBe(EstadoReserva.RECHAZADA);
    expect(prisma.equipo.update).not.toHaveBeenCalled();
  });

  it('CP-14 | Transición | cancelar APROBADA -> CANCELADA y equipo RESERVADO -> DISPONIBLE con historial', async () => {
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', equipoId: 'e1', usuarioId: 'u1', estado: EstadoReserva.APROBADA });
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.RESERVADO });

    const r = await service.cancel('r1', { id: 'u1', rol: Rol.USUARIO });

    expect(r.estado).toBe(EstadoReserva.CANCELADA);
    expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { estado: EstadoEquipo.DISPONIBLE } });
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      estadoAnterior: EstadoEquipo.RESERVADO, estadoNuevo: EstadoEquipo.DISPONIBLE }) });
  });

  it('CP-15 | Tabla de decisión | USUARIO no puede cancelar reservas ajenas (403)', async () => {
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', usuarioId: 'otro', estado: EstadoReserva.PENDIENTE });
    await expect(service.cancel('r1', { id: 'u1', rol: Rol.USUARIO }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([Rol.ADMINISTRADOR, Rol.ENCARGADO_INVENTARIO])(
    'CP-15 | Tabla de decisión | %s puede cancelar una reserva ajena',
    async (rol) => {
      prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', equipoId: 'e1', usuarioId: 'otro', estado: EstadoReserva.PENDIENTE });
      await expect(service.cancel('r1', { id: 'x', rol })).resolves.toMatchObject({ estado: EstadoReserva.CANCELADA });
    },
  );

  it('CU-04 A4 | Transición inválida | aprobar una reserva RECHAZADA lanza 409', async () => {
    prisma.reserva.findUnique.mockResolvedValue({ id: 'r1', estado: EstadoReserva.RECHAZADA });
    await expect(service.approve('r1', 'enc1')).rejects.toBeInstanceOf(ConflictException);
  });
});
