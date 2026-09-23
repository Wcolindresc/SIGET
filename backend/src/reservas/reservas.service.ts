import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  EstadoEquipo,
  EstadoReserva,
  Rol,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ReservaDto } from './dto/reserva.dto';

@Injectable()
export class ReservasService {
  constructor(private readonly p: PrismaService) {}

  async create(usuarioId: string, d: ReservaDto) {
    const inicio = new Date(d.fechaInicio);
    const fin = new Date(d.fechaFin);

    if (inicio >= fin) {
      throw new BadRequestException(
        'fechaInicio debe ser menor que fechaFin',
      );
    }

    const equipo = await this.p.equipo.findUnique({
      where: {
        id: d.equipoId,
      },
    });

    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    if (equipo.estado !== EstadoEquipo.DISPONIBLE) {
      throw new ConflictException(
        `Equipo no disponible: ${equipo.estado}`,
      );
    }

    const overlap = await this.p.reserva.findFirst({
      where: {
        equipoId: equipo.id,
        estado: {
          in: [
            EstadoReserva.PENDIENTE,
            EstadoReserva.APROBADA,
          ],
        },
        fechaInicio: {
          lt: fin,
        },
        fechaFin: {
          gt: inicio,
        },
      },
    });

    if (overlap) {
      throw new ConflictException(
        'Existe una reserva activa solapada',
      );
    }

    return this.p.reserva.create({
      data: {
        usuarioId,
        equipoId: equipo.id,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo: d.motivo,
      },
      include: {
        equipo: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
      },
    });
  }

  list() {
    return this.p.reserva.findMany({
      include: {
        equipo: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
      },
      orderBy: {
        fechaCreacion: 'desc',
      },
    });
  }

  mine(id: string) {
    return this.p.reserva.findMany({
      where: {
        usuarioId: id,
      },
      include: {
        equipo: true,
      },
      orderBy: {
        fechaCreacion: 'desc',
      },
    });
  }

  async one(id: string) {
    const reserva = await this.p.reserva.findUnique({
      where: {
        id,
      },
      include: {
        equipo: true,
        usuario: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return reserva;
  }

  async approve(
    id: string,
    aprobadorId: string,
    observacion?: string,
  ) {
    const reserva = await this.one(id);

    if (reserva.estado !== EstadoReserva.PENDIENTE) {
      throw new ConflictException(
        'Solo reservas pendientes pueden aprobarse',
      );
    }

    return this.p.$transaction(async (tx) => {
      const reservaActualizada = await tx.reserva.update({
        where: {
          id,
        },
        data: {
          estado: EstadoReserva.APROBADA,
          aprobadoPorId: aprobadorId,
          observacionRespuesta: observacion,
        },
      });

      const equipo = await tx.equipo.findUnique({
        where: {
          id: reserva.equipoId,
        },
      });

      if (equipo?.estado === EstadoEquipo.DISPONIBLE) {
        await tx.equipo.update({
          where: {
            id: reserva.equipoId,
          },
          data: {
            estado: EstadoEquipo.RESERVADO,
          },
        });

        await tx.historialEstado.create({
          data: {
            equipoId: reserva.equipoId,
            estadoAnterior: EstadoEquipo.DISPONIBLE,
            estadoNuevo: EstadoEquipo.RESERVADO,
            motivo: `Reserva ${id} aprobada`,
            usuarioId: aprobadorId,
          },
        });
      }

      return reservaActualizada;
    });
  }

  async reject(
    id: string,
    aprobadorId: string,
    observacion?: string,
  ) {
    const reserva = await this.one(id);

    if (reserva.estado !== EstadoReserva.PENDIENTE) {
      throw new ConflictException(
        'Solo reservas pendientes pueden rechazarse',
      );
    }

    return this.p.reserva.update({
      where: {
        id,
      },
      data: {
        estado: EstadoReserva.RECHAZADA,
        aprobadoPorId: aprobadorId,
        observacionRespuesta: observacion,
      },
    });
  }

  async cancel(
    id: string,
    user: {
      id: string;
      rol: Rol;
    },
  ) {
    const reserva = await this.one(id);

    if (
      user.rol === Rol.USUARIO &&
      reserva.usuarioId !== user.id
    ) {
      throw new ForbiddenException(
        'Solo puede cancelar sus propias reservas',
      );
    }

    if (
      reserva.estado !== EstadoReserva.PENDIENTE &&
      reserva.estado !== EstadoReserva.APROBADA
    ) {
      throw new ConflictException(
        'La reserva ya no puede cancelarse',
      );
    }

    return this.p.$transaction(async (tx) => {
      const reservaActualizada = await tx.reserva.update({
        where: {
          id,
        },
        data: {
          estado: EstadoReserva.CANCELADA,
        },
      });

      const equipo = await tx.equipo.findUnique({
        where: {
          id: reserva.equipoId,
        },
      });

      if (
        reserva.estado === EstadoReserva.APROBADA &&
        equipo?.estado === EstadoEquipo.RESERVADO
      ) {
        await tx.equipo.update({
          where: {
            id: reserva.equipoId,
          },
          data: {
            estado: EstadoEquipo.DISPONIBLE,
          },
        });

        await tx.historialEstado.create({
          data: {
            equipoId: reserva.equipoId,
            estadoAnterior: EstadoEquipo.RESERVADO,
            estadoNuevo: EstadoEquipo.DISPONIBLE,
            motivo: `Reserva ${id} cancelada`,
            usuarioId: user.id,
          },
        });
      }

      return reservaActualizada;
    });
  }
}