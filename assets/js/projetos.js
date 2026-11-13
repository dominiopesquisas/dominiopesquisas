/**
 * PESQUISAS ABERTAS
 * Edite esta lista para mostrar/esconder pesquisas na página inicial.
 *
 * Campos:
 *   id         identificador curto, sem espaços (vai junto no cadastro, para saber de qual pesquisa veio)
 *   status     'aberta' (aparece com o selo "Inscrições abertas"), 'em-breve' ou 'encerrada' (não aparece)
 *   titulo     título do card
 *   local      cidade/região
 *   resumo     texto curto explicando a pesquisa
 *   cidades    (opcional) lista de cidades aceitas
 *   quando     (opcional) datas
 *   incentivo  (opcional) valor pago ao participante
 *   requisito  (opcional) exigência importante
 */
window.PROJETOS = [
  {
    id: 'londrina-pr',
    status: 'aberta',
    titulo: 'Pesquisa em Londrina',
    local: 'Londrina – PR',
    resumo: 'Exclusiva para quem mora em Londrina. Analisaremos sua ficha e, se você estiver dentro do perfil procurado, entraremos em contato.',
  },
  {
    id: 'rmc-habitos-de-vida',
    status: 'aberta',
    titulo: 'Hábitos de vida na Região Metropolitana',
    local: 'Região Metropolitana de Curitiba – PR',
    resumo: 'Pesquisa presencial em Curitiba, próximo à Rodoviária, para moradores das cidades abaixo.',
    cidades: ['Araucária', 'Campo Largo', 'Colombo', 'Fazenda Rio Grande', 'Pinhais', 'São José dos Pinhais'],
    quando: '29/07 e 30/07',
    incentivo: 'R$ 120,00 + R$ 30,00 de deslocamento',
    requisito: 'Comprovante de residência em seu nome',
  },
];
