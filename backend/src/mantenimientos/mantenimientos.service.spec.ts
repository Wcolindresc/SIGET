import { ConflictException } from '@nestjs/common';
import { EstadoEquipo, EstadoMantenimiento } from '@prisma/client';
import { MantenimientosService } from './mantenimientos.service';

function crearPrismaMock(estadoMant: EstadoMantenimiento) {
  const prisma: any = {
    mantenimiento: {
      findUnique: jest.fn().mockResolvedValue({ id: 'm1', equipoId: 'e1', estado: estadoMant, equipo: { estado: EstadoEquipo.MANTENIMIENTO } }),
      update: jest.fn((a: any) => ({ id: 'm1', ...a.data })),
    },
    equipo: { update: jest.fn() },
    historialEstado: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn((cb: any) => cb(prisma));
  return prisma;
}

describe('MantenimientosService - transición de estados', () => {
  it('CP-22 | Transición inválida | no se puede finalizar un mantenimiento PENDIENTE (409)', async () => {
    const s = new MantenimientosService(crearPrismaMock(EstadoMantenimiento.PENDIENTE));
    await expect(s.finalizar('m1', 'tec1', {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('CP-22 | Transición | EN_PROCESO -> FINALIZADO y equipo vuelve a DISPONIBLE', async () => {
    const prisma = crearPrismaMock(EstadoMantenimiento.EN_PROCESO);
    const r = await new MantenimientosService(prisma).finalizar('m1', 'tec1', { costo: 150 });
    expect(r.estado).toBe(EstadoMantenimiento.FINALIZADO);
    expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { estado: EstadoEquipo.DISPONIBLE } });
  });

  it('CP-22 | Transición inválida | no se puede iniciar un mantenimiento FINALIZADO (409)', async () => {
    const s = new MantenimientosService(crearPrismaMock(EstadoMantenimiento.FINALIZADO));
    await expect(s.iniciar('m1', 'tec1')).rejects.toBeInstanceOf(ConflictException);
  });
});
