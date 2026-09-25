import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoEquipo } from '@prisma/client';
import { EquiposService } from './equipos.service';

function crearPrismaMock() {
  const prisma: any = {
    equipo: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn((a: any) => ({ id: a.where.id, ...a.data })) },
    historialEstado: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn((cb: any) => cb(prisma));
  return prisma;
}

describe('EquiposService', () => {
  let prisma: any;
  let service: EquiposService;
  beforeEach(() => { prisma = crearPrismaMock(); service = new EquiposService(prisma); });

  it('lista equipos', async () => {
    await expect(service.list()).resolves.toEqual([]);
  });

  it('CP-07 | Partición | aplica filtros de estado, categoría y búsqueda', async () => {
    await service.list(EstadoEquipo.DISPONIBLE, 'cat1', 'Equipo');
    const where = prisma.equipo.findMany.mock.calls[0][0].where;
    expect(where.estado).toBe(EstadoEquipo.DISPONIBLE);
    expect(where.categoriaId).toBe('cat1');
    expect(where.OR).toHaveLength(3);
  });

  it('CP-06 | Partición | código o serie duplicados se rechazan (409)', async () => {
    prisma.equipo.create.mockRejectedValue(new Error('Unique constraint failed'));
    await expect(service.create({ codigoInventario: 'SIGET-001', nombre: 'n', marca: 'm', modelo: 'm', numeroSerie: 'SN-SIGET-1000', categoriaId: 'c', ubicacion: 'u' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('CU-02 A2 | equipo inexistente devuelve recurso no encontrado', async () => {
    prisma.equipo.findUnique.mockResolvedValue(null);
    await expect(service.one('no-existe')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('CU-02 A3 | cambio de estado por actualización registra historial (RF-13)', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE, historial: [] });
    await service.update('e1', { estado: EstadoEquipo.BAJA }, 'admin1');
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      estadoAnterior: EstadoEquipo.DISPONIBLE, estadoNuevo: EstadoEquipo.BAJA, usuarioId: 'admin1' }) });
  });

  it('RF-13 | actualizar sin cambiar estado no genera historial', async () => {
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE, historial: [] });
    await service.update('e1', { ubicacion: 'Bodega TI' }, 'admin1');
    expect(prisma.historialEstado.create).not.toHaveBeenCalled();
  });
});
