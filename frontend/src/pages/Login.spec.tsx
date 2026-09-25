import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { Login } from './Login';

vi.mock('../api', () => ({ api: { post: vi.fn() } }));

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

describe('Pantalla de Login', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('CP-01 | login correcto guarda el token en localStorage', async () => {
    (api.post as any).mockResolvedValue({ data: { access_token: 'jwt-falso', usuario: { rol: 'ADMINISTRADOR' } } });
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => expect(localStorage.getItem('siget_token')).toBe('jwt-falso'));
  });

  it('CP-02 | login incorrecto muestra el mensaje del backend', async () => {
    (api.post as any).mockRejectedValue({ response: { data: { message: 'Credenciales inválidas' } } });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'Incorrecta1!' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(localStorage.getItem('siget_token')).toBeNull();
  });
});
