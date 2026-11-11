-- ============================================================
-- GERADO por scripts/generate-seed.mjs — nao editar a mao.
-- Fonte: data/movements.json e data/films.json
-- 9 escolas, 37 obras
-- ============================================================

begin;

-- ---------------- escolas ----------------
insert into public.movements
  (id, name, region, years, abstract, aesthetic, key_directors, hue, sat, sort_order)
values
  ('expressionismo', 'Expressionismo Alemão', 'Alemanha', '1919–1931', 'Nascido dos estúdios da UFA numa Alemanha arruinada pela guerra, o movimento abandonou a cenografia realista: cidades inteiras foram pintadas em telões oblíquos, com sombras desenhadas no chão. O mundo interior do personagem passou a ser construído em madeira e tinta.', 'Perspectiva distorcida, claro-escuro pintado, maquiagem gráfica, interpretação coreografada', array['F. W. Murnau', 'Fritz Lang', 'Robert Wiene']::text[], 222, '14%', 0),
  ('neorrealismo', 'Neorrealismo Italiano', 'Itália', '1943–1952', 'Com os estúdios de Cinecittà ocupados e sem película disponível, os italianos filmaram na rua, com atores não profissionais e luz natural. A escassez virou método: o cinema passou a filmar quem antes só aparecia ao fundo do quadro.', 'Locação real, elenco não profissional, dramaturgia do cotidiano, final sem resolução', array['Vittorio De Sica', 'Roberto Rossellini', 'Luchino Visconti']::text[], 32, '14%', 1),
  ('nouvelle-vague', 'Nouvelle Vague', 'França', '1958–1968', 'Críticos dos Cahiers du Cinéma trocaram a máquina de escrever pela câmera. Equipamento leve e película sensível permitiram filmar Paris sem permissão, improvisando diálogo e montando contra as regras — o corte seco passou a ser assinatura, não erro.', 'Jump cut, câmera na mão, som direto, citação cinéfila, atores olhando para a lente', array['Jean-Luc Godard', 'François Truffaut', 'Agnès Varda']::text[], 200, '12%', 2),
  ('cinema-novo', 'Cinema Novo', 'Brasil', '1955–1972', '“Uma câmera na mão e uma ideia na cabeça.” O movimento assumiu a precariedade como estética e programa político, filmando o sertão e a favela para explicar a formação do país. Depois de 1964, a alegoria tornou-se a forma de seguir falando.', 'Luz dura do sertão, câmera inquieta, montagem alegórica, som áspero e canto popular', array['Glauber Rocha', 'Nelson Pereira dos Santos', 'Ruy Guerra']::text[], 24, '18%', 3),
  ('japao-ouro', 'Idade de Ouro Japonesa', 'Japão', '1950–1962', 'A reconstrução do pós-guerra financiou o período mais fértil dos estúdios japoneses. Três gramáticas incompatíveis conviveram: a geometria imóvel de Ozu, o movimento pictórico de Mizoguchi e a ação em múltiplas câmeras de Kurosawa — que abriu o cinema japonês ao Ocidente em Veneza.', 'Câmera à altura do tatame, planos-sequência pintados, decupagem climática, elipse narrativa', array['Akira Kurosawa', 'Yasujirō Ozu', 'Kenji Mizoguchi']::text[], 46, '12%', 4),
  ('new-hollywood', 'New Hollywood', 'Estados Unidos', '1967–1980', 'O colapso do Código Hays e a falência dos grandes estúdios entregaram o orçamento a uma geração formada em escola de cinema. Por pouco mais de uma década, o filme comercial americano teve protagonistas moralmente indefensáveis e finais sem absolvição.', 'Zoom e teleobjetiva, som sobreposto, película granulada, locação urbana, anti-herói', array['Martin Scorsese', 'Robert Altman', 'Francis Ford Coppola']::text[], 12, '14%', 5),
  ('taiwan', 'Novo Cinema Taiwanês', 'Taiwan', '1982–2000', 'Financiado inicialmente pelo estúdio estatal, um grupo de diretores passou a filmar a história recente de Taiwan — o Terror Branco, a migração para a cidade — em planos longos e fixos. A duração do plano é o argumento: o tempo histórico precisa ser sentido, não resumido.', 'Plano longo e fixo, enquadramento por portas e janelas, som ambiente, elipse de anos', array['Hou Hsiao-hsien', 'Edward Yang', 'Tsai Ming-liang']::text[], 190, '10%', 6),
  ('j-horror', 'J-Horror', 'Japão', '1998–2005', 'O terror japonês do fim dos anos 1990 trocou o monstro pelo meio de transmissão: a fita VHS, a linha telefônica, o modem. Herdeiro do fantasma vingativo do teatro kaidan, filmou a imagem de baixa resolução como lugar onde o morto se hospeda.', 'Paleta dessaturada, enquadramento vazio, aparição na periferia do quadro, silêncio e ruído de vídeo', array['Hideo Nakata', 'Kiyoshi Kurosawa', 'Takashi Shimizu']::text[], 172, '12%', 7),
  ('dogma95', 'Dogma 95', 'Dinamarca', '1995–2002', 'Quatro diretores dinamarqueses assinaram um “voto de castidade”: locação, som direto, câmera na mão, nenhuma luz artificial, nenhum crédito de direção. O manifesto era parte provocação, parte purgação — e a câmera digital barata o tornou exequível.', 'Vídeo digital granulado, câmera trêmula, luz disponível, atuação em registro de desconforto', array['Lars von Trier', 'Thomas Vinterberg', 'Lone Scherfig']::text[], 0, '0%', 8)
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region,
  years = excluded.years,
  abstract = excluded.abstract,
  aesthetic = excluded.aesthetic,
  key_directors = excluded.key_directors,
  hue = excluded.hue,
  sat = excluded.sat,
  sort_order = excluded.sort_order;

-- ---------------- obras ----------------
-- tmdb_id, poster_path e backdrop_path vem do backfill, nao daqui:
-- scripts/backfill-tmdb-ids.mjs preenche o JSON e o seed os propaga.
-- O campo watch do JSON NAO e semeado: em v1 a disponibilidade vem
-- de /movie/{id}/watch/providers do TMDb, por regiao.
insert into public.films
  (id, tmdb_id, title, original_title, year, country, director, runtime,
   movement_id, archive_score, historical_relevance, synopsis, archival,
   poster_path, backdrop_path)
values
  ('caligari-1920', NULL, 'O Gabinete do Dr. Caligari', 'Das Cabinet des Dr. Caligari', 1920, 'Alemanha', 'Robert Wiene', 77, 'expressionismo', 94, 98, 'Um feirante hipnotizador e seu sonâmbulo atravessam uma cidade de telões pintados — e o relato de quem narra a história se revela parte do delírio.', true, NULL, NULL),
  ('nosferatu-1922', NULL, 'Nosferatu', 'Nosferatu, eine Symphonie des Grauens', 1922, 'Alemanha', 'F. W. Murnau', 94, 'expressionismo', 95, 96, 'Adaptação não autorizada de Drácula que levou o vampiro para fora do estúdio: a sombra do conde sobe a escada numa casa real, e o horror passa a ter endereço.', true, NULL, NULL),
  ('letzte-mann-1924', NULL, 'A Última Gargalhada', 'Der letzte Mann', 1924, 'Alemanha', 'F. W. Murnau', 90, 'expressionismo', 92, 94, 'Um porteiro de hotel rebaixado à lavanderia perde o uniforme que lhe dava lugar no mundo. Contado quase sem intertítulos, com a câmera solta pela primeira vez.', true, NULL, NULL),
  ('metropolis-1927', NULL, 'Metropolis', 'Metropolis', 1927, 'Alemanha', 'Fritz Lang', 153, 'expressionismo', 97, 99, 'Na cidade vertical, os que projetam vivem acima dos que movem as máquinas. Uma autômata construída à semelhança de uma operária é lançada para incendiar a revolta.', false, NULL, NULL),
  ('m-1931', NULL, 'M, o Vampiro de Düsseldorf', 'M – Eine Stadt sucht einen Mörder', 1931, 'Alemanha', 'Fritz Lang', 117, 'expressionismo', 98, 95, 'A polícia e o crime organizado caçam o mesmo assassino de crianças, cada um por seu motivo. Primeiro filme sonoro de Lang: o assobio identifica antes que a imagem mostre.', false, NULL, NULL),
  ('roma-1945', NULL, 'Roma, Cidade Aberta', 'Roma, città aperta', 1945, 'Itália', 'Roberto Rossellini', 103, 'neorrealismo', 95, 97, 'Filmado em Roma meses após a retirada alemã, com sobras de película. A resistência vista de dentro dos apartamentos, onde a decisão política é tomada na cozinha.', false, NULL, NULL),
  ('ladri-1948', NULL, 'Ladrões de Bicicleta', 'Ladri di biciclette', 1948, 'Itália', 'Vittorio De Sica', 89, 'neorrealismo', 98, 98, 'Um operário recém-contratado tem a bicicleta roubada e percorre Roma com o filho para encontrá-la. Sem ela, não há emprego; sem emprego, não há nada.', false, NULL, NULL),
  ('terra-trema-1948', NULL, 'A Terra Treme', 'La terra trema', 1948, 'Itália', 'Luchino Visconti', 160, 'neorrealismo', 90, 88, 'Uma família de pescadores sicilianos tenta romper com os atravessadores e compra o próprio barco. Falado em dialeto, interpretado pelos próprios moradores de Aci Trezza.', false, NULL, NULL),
  ('umberto-1952', NULL, 'Umberto D.', 'Umberto D.', 1952, 'Itália', 'Vittorio De Sica', 89, 'neorrealismo', 94, 86, 'Um funcionário público aposentado não consegue pagar o aluguel do quarto onde mora com seu cachorro. O filme mais seco do movimento e o favorito de De Sica.', false, NULL, NULL),
  ('400-coups-1959', NULL, 'Os Incompreendidos', 'Les quatre cents coups', 1959, 'França', 'François Truffaut', 99, 'nouvelle-vague', 97, 96, 'Antoine Doinel foge da escola, da casa dos pais e por fim do reformatório, até alcançar o mar que nunca tinha visto — e olhar para a câmera.', false, NULL, NULL),
  ('bout-souffle-1960', NULL, 'O Acossado', 'À bout de souffle', 1960, 'França', 'Jean-Luc Godard', 90, 'nouvelle-vague', 96, 99, 'Um pequeno ladrão de carros que imita Bogart mata um policial e tenta convencer uma estudante americana a fugir com ele. O jump cut entra na gramática do cinema.', false, NULL, NULL),
  ('cleo-1962', NULL, 'Cleo de 5 às 7', 'Cléo de 5 à 7', 1962, 'França', 'Agnès Varda', 90, 'nouvelle-vague', 93, 91, 'Noventa minutos quase em tempo real: uma cantora atravessa Paris esperando um resultado de biópsia e deixa de ser olhada para começar a olhar.', false, NULL, NULL),
  ('pierrot-1965', NULL, 'O Demônio das Onze Horas', 'Pierrot le fou', 1965, 'França', 'Jean-Luc Godard', 110, 'nouvelle-vague', 90, 87, 'Um homem abandona a vida burguesa em Paris e desce para o Mediterrâneo com a ex-amante e os credores dela atrás. Cor saturada, interrupções em bloco, dinamite.', false, NULL, NULL),
  ('rio-40-1955', NULL, 'Rio, 40 Graus', 'Rio, 40 Graus', 1955, 'Brasil', 'Nelson Pereira dos Santos', 100, 'cinema-novo', 86, 90, 'Um domingo na vida de cinco meninos que descem o morro para vender amendoim na cidade. Censurado antes de estrear, é a semente do movimento.', true, NULL, NULL),
  ('vidas-secas-1963', NULL, 'Vidas Secas', 'Vidas Secas', 1963, 'Brasil', 'Nelson Pereira dos Santos', 103, 'cinema-novo', 93, 95, 'Fabiano, Sinhá Vitória e os dois filhos atravessam a caatinga em fuga da seca. Da luz branca estourada ao chiado do carro de boi, tudo recusa o conforto.', true, NULL, NULL),
  ('deus-diabo-1964', NULL, 'Deus e o Diabo na Terra do Sol', 'Deus e o Diabo na Terra do Sol', 1964, 'Brasil', 'Glauber Rocha', 125, 'cinema-novo', 94, 97, 'Um vaqueiro mata o patrão e segue primeiro um beato, depois um cangaceiro, enquanto um matador contratado encerra os dois ciclos. O sertão vai virar mar.', false, NULL, NULL),
  ('os-fuzis-1964', NULL, 'Os Fuzis', 'Os Fuzis', 1964, 'Brasil', 'Ruy Guerra', 110, 'cinema-novo', 87, 88, 'Soldados são enviados para proteger um armazém de alimentos de uma população faminta no sertão de Minas. O rifle como único argumento do Estado.', true, NULL, NULL),
  ('terra-transe-1967', NULL, 'Terra em Transe', 'Terra em Transe', 1967, 'Brasil', 'Glauber Rocha', 115, 'cinema-novo', 91, 93, 'No país imaginário de Eldorado, um poeta oscila entre dois populistas e termina com um fuzil na mão. A alegoria como resposta ao golpe de 1964.', false, NULL, NULL),
  ('bonnie-1967', NULL, 'Bonnie e Clyde', 'Bonnie and Clyde', 1967, 'Estados Unidos', 'Arthur Penn', 111, 'new-hollywood', 91, 96, 'Dois assaltantes de banco atravessam o Centro-Oeste na Depressão, filmados com a liberdade formal da Europa e uma morte em câmera lenta que abriu a década.', false, NULL, NULL),
  ('godfather-1972', NULL, 'O Poderoso Chefão', 'The Godfather', 1972, 'Estados Unidos', 'Francis Ford Coppola', 175, 'new-hollywood', 98, 98, 'A sucessão de uma família siciliana em Nova York, contada em interiores âmbar onde todo assassinato é uma decisão administrativa.', false, NULL, NULL),
  ('nashville-1975', NULL, 'Nashville', 'Nashville', 1975, 'Estados Unidos', 'Robert Altman', 160, 'new-hollywood', 92, 90, 'Vinte e quatro personagens cruzam cinco dias de música country e campanha eleitoral. Som sobreposto em oito canais: ninguém espera a fala do outro terminar.', false, NULL, NULL),
  ('taxi-driver-1976', NULL, 'Taxi Driver', 'Taxi Driver', 1976, 'Estados Unidos', 'Martin Scorsese', 114, 'new-hollywood', 95, 94, 'Um veterano insone dirige à noite por Manhattan e decide limpar a cidade sozinho. O vapor da rua, o neon vermelho e o último saxofone de Bernard Herrmann.', false, NULL, NULL),
  ('days-heaven-1978', NULL, 'Cinzas no Paraíso', 'Days of Heaven', 1978, 'Estados Unidos', 'Terrence Malick', 94, 'new-hollywood', 90, 85, 'Três trabalhadores migrantes chegam à colheita de trigo do Texas em 1916 e armam uma farsa que termina em fogo. Filmado quase inteiro na hora mágica.', false, NULL, NULL),
  ('rashomon-1950', NULL, 'Rashômon', 'Rashōmon', 1950, 'Japão', 'Akira Kurosawa', 88, 'japao-ouro', 96, 98, 'Quatro testemunhas narram o mesmo assassinato na floresta, e as quatro versões se contradizem. O Leão de Ouro em Veneza abriu o cinema japonês ao mundo.', false, NULL, NULL),
  ('ugetsu-1953', NULL, 'Contos da Lua Vaga', 'Ugetsu monogatari', 1953, 'Japão', 'Kenji Mizoguchi', 96, 'japao-ouro', 95, 93, 'Dois camponeses deixam as mulheres para enriquecer durante a guerra civil; um deles é retido por um fantasma. O plano-sequência como pincel sobre a névoa do lago.', false, NULL, NULL),
  ('tokyo-1953', NULL, 'Era uma Vez em Tóquio', 'Tōkyō monogatari', 1953, 'Japão', 'Yasujirō Ozu', 136, 'japao-ouro', 98, 96, 'Um casal de idosos viaja de Onomichi para visitar os filhos adultos em Tóquio e descobre que não há tempo para eles. A câmera nunca se levanta do tatame.', false, NULL, NULL),
  ('shichinin-1954', NULL, 'Os Sete Samurais', 'Shichinin no samurai', 1954, 'Japão', 'Akira Kurosawa', 207, 'japao-ouro', 97, 97, 'Uma aldeia de camponeses contrata sete rōnin para enfrentar os bandidos que levam sua colheita. A batalha final na lama reescreveu a decupagem de ação.', false, NULL, NULL),
  ('ringu-1998', NULL, 'O Chamado', 'Ringu', 1998, 'Japão', 'Hideo Nakata', 96, 'j-horror', 87, 93, 'Uma repórter investiga uma fita VHS que mata quem a assiste em sete dias. O medo mora na má qualidade da imagem — e no fato de que ela se copia.', false, NULL, NULL),
  ('kairo-2001', NULL, 'Pulse', 'Kairo', 2001, 'Japão', 'Kiyoshi Kurosawa', 118, 'j-horror', 85, 88, 'Os mortos começam a chegar pela internet discada e a solidão se espalha como epidemia. Enquadramentos amplos onde a aparição ocupa o canto do plano.', false, NULL, NULL),
  ('juon-2002', NULL, 'O Grito', 'Ju-on', 2002, 'Japão', 'Takashi Shimizu', 92, 'j-horror', 78, 82, 'Uma casa em Nerima retém a fúria de um crime doméstico e contamina todos que entram. Narrativa em fragmentos fora de ordem, cada um visto por uma vítima.', false, NULL, NULL),
  ('honogurai-2002', NULL, 'Água Negra', 'Honogurai mizu no soko kara', 2002, 'Japão', 'Hideo Nakata', 101, 'j-horror', 80, 76, 'Uma mãe em disputa pela guarda da filha se muda para um edifício onde o teto não para de vazar. O horror doméstico escorrendo da caixa d’água.', false, NULL, NULL),
  ('beiqing-1989', NULL, 'Cidade Dolorosa', 'Beiqing chengshi', 1989, 'Taiwan', 'Hou Hsiao-hsien', 157, 'taiwan', 94, 93, 'Quatro irmãos atravessam a transição de Taiwan do domínio japonês ao Terror Branco. Primeiro filme a nomear o massacre de 1947 — e Leão de Ouro em Veneza.', false, NULL, NULL),
  ('brighter-1991', NULL, 'Brighter Summer Day', 'Gu ling jie shaonian sha ren shijian', 1991, 'Taiwan', 'Edward Yang', 237, 'taiwan', 95, 90, 'Taipé, 1960: filhos de exilados do continente formam gangues entre o toque de recolher e o rock americano. Quatro horas que terminam num único gesto irreversível.', false, NULL, NULL),
  ('yiyi-2000', NULL, 'Yi Yi', 'Yi Yi', 2000, 'Taiwan', 'Edward Yang', 173, 'taiwan', 96, 89, 'Três gerações de uma família de Taipé entre um casamento e um enterro. Um menino fotografa a nuca das pessoas, porque ninguém consegue ver a própria.', false, NULL, NULL),
  ('festen-1998', NULL, 'Festa de Família', 'Festen', 1998, 'Dinamarca', 'Thomas Vinterberg', 105, 'dogma95', 88, 92, 'No jantar dos sessenta anos do patriarca, o filho mais velho faz um discurso que destrói a família. Dogma nº 1, filmado em vídeo com a luz da própria sala.', false, NULL, NULL),
  ('idioterne-1998', NULL, 'Os Idiotas', 'Idioterne', 1998, 'Dinamarca', 'Lars von Trier', 117, 'dogma95', 76, 85, 'Um grupo de jovens burgueses finge deficiência em público para encontrar o próprio “idiota interior”. Dogma nº 2, e o teste mais desconfortável do manifesto.', false, NULL, NULL),
  ('italiensk-2000', NULL, 'Italiano para Principiantes', 'Italiensk for begyndere', 2000, 'Dinamarca', 'Lone Scherfig', 112, 'dogma95', 74, 70, 'Seis solitários de um subúrbio de Copenhague se encontram num curso noturno de italiano. Dogma nº 12 — a prova de que o voto de castidade também servia à comédia.', false, NULL, NULL)
on conflict (id) do update set
  tmdb_id = coalesce(excluded.tmdb_id, public.films.tmdb_id),
  title = excluded.title,
  original_title = excluded.original_title,
  year = excluded.year,
  country = excluded.country,
  director = excluded.director,
  runtime = excluded.runtime,
  movement_id = excluded.movement_id,
  archive_score = excluded.archive_score,
  historical_relevance = excluded.historical_relevance,
  synopsis = excluded.synopsis,
  archival = excluded.archival,
  poster_path = coalesce(excluded.poster_path, public.films.poster_path),
  backdrop_path = coalesce(excluded.backdrop_path, public.films.backdrop_path);

commit;
