// services/personaService.ts

export interface Persona {
  id: number;
  name: string;
  role: string;
}

/**
 * getPersonas: simulates fetching persona list.
 */
export async function getPersonas(): Promise<Persona[]> {
  return [
    { id: 1, name: 'EVE', role: 'Assistant' },
    { id: 2, name: 'Ollama', role: 'Model' },
  ];
}
