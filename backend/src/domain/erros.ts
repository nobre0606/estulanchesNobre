// Erro de aplicação com status HTTP e código legível pela interface.
// O error handler central transforma isso em { erro: { codigo, mensagem } }.
export class ErroApp extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroApp';
  }
}

export const naoEncontrado = (mensagem = 'Recurso não encontrado') =>
  new ErroApp(404, 'NAO_ENCONTRADO', mensagem);
