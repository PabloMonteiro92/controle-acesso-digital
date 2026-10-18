/** Dados fictícios para a demonstração. Gera sempre registos do dia atual. */

const SEQUENCIA = [
  // [minutos desde o início do turno, nome, placa, tipo, observacao]
  [0, "Ana Ribeiro", "41-AB-27", "entrada", "Carrinha de material"],
  [8, "Bruno Carvalho", "73-QR-05", "entrada", ""],
  [22, "Filipe Antunes", "19-MX-66", "entrada", "2 pessoas no carro"],
  [35, "Graça Moreira", "", "entrada", "A pé"],
  [51, "Hugo Teixeira", "58-LD-31", "entrada", ""],
  [74, "Lara Nogueira", "26-TN-90", "entrada", "Manutenção do portão 2"],
  [96, "Carla Mendes", "84-HP-12", "entrada", ""],
  [130, "Bruno Carvalho", "73-QR-05", "saida", "Saída para almoço"],
  [141, "Visitante sem convite", "09-ZZ-44", "entrada", "Disse que vinha ver o armazém"],
  [168, "Bruno Carvalho", "73-QR-05", "entrada", "Regressou do almoço"],
  [190, "Ana Ribeiro", "41-AB-27", "saida", ""],
];

export function seedRegistros(agora = new Date(), autorizados = []) {
  const nomes = new Set(autorizados.map((a) => a.nome));
  const inicioDia = new Date(agora);
  inicioDia.setHours(0, 0, 0, 0);
  const minutosHoje = (agora - inicioDia) / 60000;
  const duracao = SEQUENCIA[SEQUENCIA.length - 1][0];
  // Termina 5 minutos antes de agora e nunca passa para o dia anterior.
  const escala = Math.max(0.02, Math.min(1, (minutosHoje - 5) / duracao));
  const fim = agora.getTime() - 5 * 60000;

  return SEQUENCIA.map(([min, nome, placa, tipo, observacao], i) => ({
    id: `demo-${i}`,
    nome,
    placa,
    tipo,
    observacao,
    usuario: "demo@controle-acesso.app",
    ts: new Date(fim - (duracao - min) * escala * 60000),
    autorizado: nomes.size ? nomes.has(nome) : true,
  }));
}
