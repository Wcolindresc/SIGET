import { EstadoEquipo, Severidad } from '@prisma/client';
import { IncidenciasService } from './incidencias.service';

function crearPrismaMock() {
  const prisma: any = {
    equipo: { findUnique: jest.fn(), update: jest.fn() },
    incidencia: { create: jest.fn().mockResolvedValue({ id: 'i1' }) },
    historialEstado: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn((cb: any) => cb(prisma));
  return prisma;
}

describe('IncidenciasService', () => {
  it.each<[Severidad, boolean]>([
    [Severidad.BAJA, false],
    [Severidad.MEDIA, false],
    [Severidad.ALTA, false],
    [Severidad.CRITICA, true],
  ])('CP-21 | Partición | severidad %s cambia a MANTENIMIENTO: %s', async (severidad, cambia) => {
    const prisma = crearPrismaMock();
    prisma.equipo.findUnique.mockResolvedValue({ id: 'e1', estado: EstadoEquipo.DISPONIBLE });
    await new IncidenciasService(prisma).create({ equipoId: 'e1', titulo: 't', descripcion: 'd', severidad }, 'tec1');
    expect(prisma.equipo.update).toHaveBeenCalledTimes(cambia ? 1 : 0);
  });
});
