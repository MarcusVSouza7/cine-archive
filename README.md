# Cine:Archive

Protótipo de um arquivo de cinema de curadoria: **37 obras fundamentais organizadas por escolas cinematográficas**, não por popularidade ou algoritmo. Cada ficha devolve o filme ao movimento que o produziu.

Página única, sem dependências, sem build. Abra o `index.html` e funciona.

---

## Conceito

Minimalismo clássico de revista de crítica impressa, aplicado a uma interface. Três decisões governam o resto:

**Tema único escuro, deliberado.** A sala de projeção. Fundo e todas as cores são pintados explicitamente — a página não herda o tema do navegador nem do host onde é embutida.

**Estrutura por filetes, não por cartões.** Nenhuma borda arredondada, nenhuma sombra, nenhum cartão. A hierarquia vem de filetes a 12% de opacidade, de espaço negativo e da escala tipográfica. Seções usam uma coluna-rubrica fixa à esquerda e o conteúdo à direita, como as cabeças correntes de um periódico.

**Pôsteres compostos no navegador.** Nenhuma imagem é carregada de fora. Cada pôster é uma *placa tipográfica* gerada em CSS — título original na serifa, número de catálogo, diretor e duração sobre uma tinta HSL derivada da escola do filme (azul-frio no expressionismo, ocre no Cinema Novo, verde-doente no J-Horror), com grão de película em `feTurbulence`. O enquadramento é 2:3, pronto para receber cartazes licenciados nos mesmos slots sem mudar o layout.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#0E0E10` | fundo, a sala escura |
| `--ink-2` | `#141418` | planos elevados (ficha, blocos de código) |
| `--cream` | `#F4F4F0` | texto principal |
| `--muted` | `#8F8A80` | texto secundário — cinza quente, com viés para o acento |
| `--faint` | `#605B54` | labels, metadados |
| `--sepia` | `#A98253` | **único** acento: filetes ativos, números de ranking, acervos |
| `--rule` | `rgba(244,244,240,.12)` | toda a estrutura da página |

### Tipografia

- **Cormorant Garamond** (300 / 400 / 500 + itálico) — títulos, fichas, placas, valores de dados.
- **Inter** (400 / 500 / 600) — menu, labels, números tabulares.

Labels em caixa alta com `.14`–`.2em` de tracking. Todos os números com `font-variant-numeric: tabular-nums`. Fontes vêm do Google Fonts com pilha de fallback real declarada.

---

## Estrutura

| Seção | O que faz |
|---|---|
| **Cabeçalho** | Logo, menu, busca em overlay (ícone ou `Ctrl K`; `Enter` abre a primeira ficha, `Esc` fecha) |
| **A seleção** | Seis entradas curadas — a porta de entrada mais limpa para cada corrente |
| **Escolas** | 9 correntes com verbete editorial: condições históricas, diretores-chave, marcas estéticas e as 3 obras essenciais clicáveis |
| **Explorador** | Filtros de país, década e escola + ordenação, com chips de filtro ativo e alternância Grade ⇄ Lista editorial |
| **Rankings** | Dois modos próprios — *Top por década* e *Top por país* — que agrupam e numeram 1–5 dentro de cada grupo, respeitando os filtros ativos |
| **Ficha do filme** | Placa, título original, ficha técnica, sinopse, as duas notas, onde assistir e conexões (escola, mesmo diretor, mesma corrente) |
| **Sobre** | Critério de curadoria e o esquema JSON comentado |

### Acessibilidade e responsividade

- Coluna única a partir de ~860px; grade fluida com `auto-fill`; nada estoura a largura da tela.
- `aria-pressed` nos alternadores, `role="dialog"` + `aria-modal` nos overlays, foco devolvido ao elemento de origem ao fechar.
- `:focus-visible` com contorno sépia; `prefers-reduced-motion` desliga animações e scroll suave.

---

## Arquitetura de dados

Duas coleções e uma chave estrangeira. `movement` é o campo que sustenta **três** superfícies ao mesmo tempo — a seção de Escolas, o filtro do explorador e o bloco de conexões da ficha. A década é sempre derivada de `year`, nunca armazenada.

```
data/
├── movements.json   9 registros
└── films.json      37 registros
```

### `movements.json`

```json
{
  "id": "cinema-novo",
  "name": "Cinema Novo",
  "region": "Brasil",
  "years": "1955–1972",
  "abstract": "…",
  "aesthetic": "…",
  "keyDirectors": ["Glauber Rocha", "Nelson Pereira dos Santos", "Ruy Guerra"],
  "hue": 24,
  "sat": "18%"
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `string` | slug, chave primária |
| `years` | `string` | faixa editorial, não data exata |
| `abstract` | `string` | 2–3 frases de contexto histórico |
| `aesthetic` | `string` | marcas formais separadas por vírgula |
| `hue` / `sat` | `number` / `string` | tinta HSL da placa daquela escola |

### `films.json`

```json
{
  "id": "deus-diabo-1964",
  "title": "Deus e o Diabo na Terra do Sol",
  "originalTitle": "Deus e o Diabo na Terra do Sol",
  "year": 1964,
  "country": "Brasil",
  "director": "Glauber Rocha",
  "runtime": 125,
  "movement": "cinema-novo",
  "rating": 94,
  "relevance": 97,
  "synopsis": "…",
  "watch": ["MUBI", "Itaú Cultural Play"],
  "archival": false
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `string` | slug + ano |
| `title` / `originalTitle` | `string` | o original é o que aparece na placa |
| `year` | `number` | a década é derivada, nunca armazenada |
| `runtime` | `number` | minutos, inteiro |
| `movement` | `string` | **FK → `movements.id`** |
| `rating` | `number` | nota do arquivo, 0–100 |
| `relevance` | `number` | relevância histórica, 0–100 |
| `watch` | `string[]` | plataformas e acervos de preservação |
| `archival` | `boolean` | `true` → preservação ou domínio público, marcado em sépia na ficha |

As duas notas são mantidas **separadas de propósito**: consenso crítico e impacto histórico não são a mesma pergunta, e *Vidas Secas* e *O Poderoso Chefão* não deveriam competir na mesma coluna.

### Cobertura do acervo

9 escolas · 8 cinematografias (Alemanha, Itália, França, Brasil, Estados Unidos, Japão, Taiwan, Dinamarca) · 9 décadas, de **1920 a 2002**.

Expressionismo Alemão · Neorrealismo Italiano · Nouvelle Vague · Cinema Novo · Idade de Ouro Japonesa · New Hollywood · Novo Cinema Taiwanês · J-Horror · Dogma 95

---

## Procedência dos dados

Títulos, títulos originais, diretores, anos, países e durações são verificáveis.

**`rating`, `relevance` e `watch` são valores de demonstração deste protótipo.** Não vêm de nenhum agregador e não devem ser lidos como tal — a página diz isso na abertura e na seção Sobre. A estrutura está pronta para receber um acervo real pelo esquema acima.

---

## Rodar

Abrir direto funciona, porque os dados estão embutidos no HTML em `<script type="application/json">`:

```sh
start index.html      # Windows
```

Os arquivos em `data/` são a mesma fonte, extraídos para consumo por uma API ou build futuro. Para servir via HTTP:

```sh
python -m http.server 8000
```

---

## Estado

Protótipo de conceito visual e arquitetura de informação. O que viria depois:

- [ ] Trocar as placas tipográficas por cartazes licenciados nos mesmos slots 2:3
- [ ] Mover `data/` para uma API e carregar por `fetch`
- [ ] Notas de arquivo com proveniência citada por obra
- [ ] Páginas próprias por diretor e por escola, com URL própria
- [ ] Disponibilidade de streaming por região, via provedor real
