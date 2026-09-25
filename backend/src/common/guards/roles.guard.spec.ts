import { Rol } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const ctx = (rol?: Rol): any => ({
  getHandler: () => null,
  getClass: () => null,
  switchToHttp: () => ({ getRequest: () => ({ user: rol ? { rol } : undefined }) }),
});

describe('RolesGuard - control de acceso', () => {
  const reflector: any = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector);

  it.each<[Rol, boolean]>([
    [Rol.ADMINISTRADOR, true],
    [Rol.ENCARGADO_INVENTARIO, true],
    [Rol.USUARIO, false],
    [Rol.TECNICO, false],
  ])('CP-04 | Tabla de decisión | POST /equipos con rol %s => permitido: %s', (rol, esperado) => {
    reflector.getAllAndOverride.mockReturnValue([Rol.ADMINISTRADOR, Rol.ENCARGADO_INVENTARIO]);
    expect(guard.canActivate(ctx(rol))).toBe(esperado);
  });

  it('RNF-02 | sin usuario autenticado se deniega', () => {
    reflector.getAllAndOverride.mockReturnValue([Rol.ADMINISTRADOR]);
    expect(guard.canActivate(ctx())).toBe(false);
  });
});
