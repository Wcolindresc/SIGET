import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('AuthService', () => {
  const usuario = { id: 'u1', nombre: 'Admin', apellido: 'SIGET', correo: 'admin@siget.local', rol: 'ADMINISTRADOR', activo: true, passwordHash: 'hash' };
  const crear = (u: unknown) => {
    const prisma: any = { usuario: { findUnique: jest.fn().mockResolvedValue(u) } };
    const jwt: any = { signAsync: jest.fn().mockResolvedValue('jwt-firmado') };
    return { s: new AuthService(prisma, jwt), jwt };
  };

  it('CP-01 | Partición | credenciales válidas devuelven access_token y datos sin passwordHash', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const { s, jwt } = crear(usuario);
    const r = await s.login('admin@siget.local', 'Cambiar123!');
    expect(r.access_token).toBe('jwt-firmado');
    expect(r.usuario).not.toHaveProperty('passwordHash');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', correo: 'admin@siget.local', rol: 'ADMINISTRADOR' });
  });

  it('CP-02 | Partición | contraseña incorrecta se rechaza (401)', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(crear(usuario).s.login('admin@siget.local', 'ClaveIncorrecta123')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('CU-01 A1 | usuario inexistente se rechaza (401)', async () => {
    await expect(crear(null).s.login('nadie@siget.local', '12345678')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('CU-01 A1 | cuenta inactiva se rechaza aunque la contraseña sea correcta (401)', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    await expect(crear({ ...usuario, activo: false }).s.login('admin@siget.local', 'Cambiar123!')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
