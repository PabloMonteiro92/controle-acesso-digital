# Changelog

## 2.0.0

Reescrita completa da versão original.

### Adicionado
- Modo demonstração autónomo (localStorage), sem dependência de servidor.
- Camada de dados com dois adaptadores (`local` e `firebase`) e o mesmo contrato.
- Quadro do dia, lista "Dentro agora" e atalho de saída.
- Avisos de entrada repetida e de saída sem entrada.
- Histórico com filtros, exportação CSV e relatório para impressão.
- Gestão da lista de autorizados (adicionar, remover, importar JSON).
- Tema escuro, navegação por teclado, `prefers-reduced-motion`.
- Testes unitários (`npm test`) e regras de segurança de exemplo (`firestore.rules`).
- Fontes e ícones incluídos no projeto (Barlow, licença OFL).

### Alterado
- Interface redesenhada (portaria industrial, placa do veículo como elemento central).
- Página única em vez de `index.html` e `dashboard.html` separados.
- Comparação de nomes sem acentos nem maiúsculas.
- Placas validadas e formatadas.
- Service worker reescrito (rede primeiro para HTML e dados, cache para o resto).
- Manifesto com ícones `any` e `maskable` separados.

### Removido
- Chave e identificadores do Firebase do código.
- Criação de conta aberta no ecrã de login.
- `alert()`, `prompt()` e `confirm()`.
- Dependências de Font Awesome, Google Fonts e jsPDF.
- Ficheiros duplicados e ícones que não eram usados.

### Corrigido
- Falha na instalação do service worker por referências a ficheiros inexistentes.
- Tipo de movimento guardado com acento (`saída`); passa a `saida`, sem caracteres especiais nos dados.

## 1.0.0

Primeira versão. Registo de entradas e saídas com Firebase Firestore e PWA.
