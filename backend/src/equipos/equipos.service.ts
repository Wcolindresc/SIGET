import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  EstadoEquipo,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  EquipoDto,
  EquipoUpdateDto,
} from './dto/equipo.dto';

@Injectable()
export class EquiposService {
  constructor(private readonly p: PrismaService) {}

  list(
    estado?: EstadoEquipo,
    categoriaId?: string,
    buscar?: string,
  ) {
    const where: Prisma.EquipoWhereInput = {
      ...(estado ? { estado } : {}),
      ...(categoriaId ? { categoriaId } : {}),
      ...(buscar
        ? {
            OR: [
              {
                nombre: {
                  contains: buscar,
                  mode: 'insensitive',
                },
              },
              {
                codigoInventario: {
                  contains: buscar,
                  mode: 'insensitive',
                },
              },
              {
                numeroSerie: {
                  contains: buscar,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return this.p.equipo.findMany({
      where,
      include: {
        categoria: true,
      },
      orderBy: {
        fechaCreacion: 'desc',
      },
    });
  }

  async one(id: string) {
    const equipo = await this.p.equipo.findUnique({
      where: { id },
      include: {
        categoria: true,
        historial: {
          orderBy: {
            fecha: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    return equipo;
  }

  async create(d: EquipoDto) {
    try {
      return await this.p.equipo.create({
        data: {
          ...d,
          fechaAdquisicion: d.fechaAdquisicion
            ? new Date(d.fechaAdquisicion)
            : undefined,
        },
      });
    } catch {
      throw new ConflictException(
        'Código de inventario o número de serie duplicado',
      );
    }
  }

  async update(
    id: string,
    d: EquipoUpdateDto,
    userId: string,
  ) {
    const equipoActual = await this.one(id);

    if (
      d.estado &&
      d.estado !== equipoActual.estado
    ) {
      return this.p.$transaction(async (tx) => {
        const actualizado = await tx.equipo.update({
          where: { id },
          data: d,
        });

        await tx.historialEstado.create({
          data: {
            equipoId: id,
            estadoAnterior: equipoActual.estado,
            estadoNuevo: d.estado!,
            motivo: 'Actualización manual',
            usuarioId: userId,
          },
        });

        return actualizado;
      });
    }

    return this.p.equipo.update({
      where: { id },
      data: d,
    });
  }

  async changeState(
    id: string,
    newState: EstadoEquipo,
    motivo: string,
    userId: string,
    tx = this.p,
  ) {
    const equipo = await tx.equipo.findUnique({
      where: { id },
    });

    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    if (equipo.estado === newState) {
      return equipo;
    }

    const actualizado = await tx.equipo.update({
      where: { id },
      data: {
        estado: newState,
      },
    });

    await tx.historialEstado.create({
      data: {
        equipoId: id,
        estadoAnterior: equipo.estado,
        estadoNuevo: newState,
        motivo,
        usuarioId: userId,
      },
    });

    return actualizado;
  }
}