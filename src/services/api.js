import { auth } from './firebase';
import { API_URL } from '../constants';

async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function request(method, path, body = null) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error del servidor');
  return data;
}

export const api = {
  // Auth
  register: (nombre, departamento) =>
    request('POST', '/auth/register', { nombre, departamento }),
  me: () => request('GET', '/auth/me'),

  // Análisis
  analizar: (poligono, modo, cultivo) =>
    request('POST', '/analizar', { poligono, modo, cultivo }),

  // Parcelas
  getParcelas: () => request('GET', '/parcelas'),
  getParcela: (id) => request('GET', `/parcelas/${id}`),
  saveParcela: (data) => request('POST', '/parcelas', data),
  updateParcela: (id, data) => request('PUT', `/parcelas/${id}`, data),
  deleteParcela: (id) => request('DELETE', `/parcelas/${id}`),
  getCalendario: (id, municipio = 'Santa Cruz') =>
    request('GET', `/parcelas/${id}/calendario?municipio=${encodeURIComponent(municipio)}`),

  // Chat
  chat: (pregunta, parcela_id = null) =>
    request('POST', '/chat', { pregunta, parcela_id }),

  // Árboles registrados
  getArboles: (parcela_id) => request('GET', `/parcelas/${parcela_id}/arboles`),
  registrarArbol: (parcela_id, data) => request('POST', `/parcelas/${parcela_id}/arboles`, data),
  actualizarArbol: (parcela_id, arbol_id, data) => request('PUT', `/parcelas/${parcela_id}/arboles/${arbol_id}`, data),
  eliminarArbol: (parcela_id, arbol_id) => request('DELETE', `/parcelas/${parcela_id}/arboles/${arbol_id}`),
  agregarFotoArbol: (parcela_id, arbol_id, foto_url) => request('POST', `/parcelas/${parcela_id}/arboles/${arbol_id}/fotos`, { foto_url }),

  // Voz
  transcribir: (audio_base64) => request('POST', '/voz/transcribir', { audio_base64 }),
  sintetizar: (texto) => request('POST', '/voz/sintetizar', { texto }),
};
