import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { EquiposModule } from './equipos/equipos.module';
import { ReservasModule } from './reservas/reservas.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { IncidenciasModule } from './incidencias/incidencias.module';
import { MantenimientosModule } from './mantenimientos/mantenimientos.module';
import { ReportesModule } from './reportes/reportes.module';
@Module({imports:[PrismaModule,AuthModule,UsuariosModule,CategoriasModule,EquiposModule,ReservasModule,PrestamosModule,IncidenciasModule,MantenimientosModule,ReportesModule]}) export class AppModule{}
