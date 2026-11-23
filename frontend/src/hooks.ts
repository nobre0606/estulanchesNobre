import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemDeErro } from './api';

/**
 * Carrega dados e (opcionalmente) recarrega a cada N ms — polling simples,
 * sem WebSocket. Pausa quando a aba está escondida para não gastar à toa.
 */
export function useDados<T>(carregar: () => Promise<T>, intervaloMs?: number, chave?: unknown) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  const recarregar = useCallback(async () => {
    try {
      setDados(await carregarRef.current());
      setErro(null);
      setAtualizadoEm(Date.now());
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    recarregar();
    if (!intervaloMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') recarregar();
    }, intervaloMs);
    return () => clearInterval(id);
    // "chave" muda (ex.: filtro de categoria) → recarrega na hora
  }, [recarregar, intervaloMs, chave]);

  return { dados, erro, atualizadoEm, recarregar };
}

/** Relógio que "anda" a cada 30 s, para textos como "há 3 min" se atualizarem. */
export function useAgora(intervaloMs = 30_000) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}
