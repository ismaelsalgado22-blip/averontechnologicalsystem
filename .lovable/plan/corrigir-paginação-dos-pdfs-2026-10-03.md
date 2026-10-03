# Corrigir paginação dos PDFs

## Objetivo
Evitar textos, tabelas, assinaturas e rodapés sobrepostos quando um documento ultrapassar o espaço disponível na página.

## Implementação
- Criar um controle central de espaço disponível que finalize a página atual, aplique o rodapé e abra uma nova página com cabeçalho de continuação.
- Adaptar blocos de texto para dividir o conteúdo entre páginas, preservando rótulos e espaçamento.
- Adaptar pares de informações e tabelas de itens para calcular a altura real de cada linha e repetir o cabeçalho da tabela quando houver quebra de página.
- Garantir espaço antes de títulos de seção, totais, QR Code e áreas de assinatura.
- Aplicar a paginação aos orçamentos, ordens de serviço, laudos técnicos e certificados de garantia.

## Validação
- Gerar documentos de teste com textos e listas extensas.
- Renderizar todas as páginas como imagens e conferir visualmente margens, cortes, sobreposições e continuidade.
- Confirmar que o aplicativo continua sem erros.

## Escopo
A alteração ficará restrita à geração dos PDFs; telas, dados e regras comerciais não serão modificados.
