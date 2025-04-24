# 📊 Dynamic Network Graph Generator

Uma ferramenta web simples para visualizar conexões entre nós definidas pelo usuário através de uma entrada de texto simples. Crie e interaja com grafos de rede dinamicamente no seu navegador.

![Placeholder for Screenshot/GIF](https://github.com/RafaelPompeu/network-created/blob/main/network.png)
*(Sugestão: Substitua o link acima por um screenshot ou GIF do seu grafo em ação!)*

## ✨ Funcionalidades

*   **Entrada Dinâmica:** Defina as conexões do seu grafo usando um formato de texto simples (`nó_origem -> nó_destino`).
*   **Geração Instantânea:** Clique no botão para gerar ou atualizar a visualização do grafo com base na sua entrada.
*   **Visualização Interativa:**
    *   **Zoom:** Aproxime e afaste usando os botões ou a roda do mouse.
    *   **Pan (Arrastar):** Mova a visualização do grafo clicando e arrastando o fundo.
    *   **Arrastar Nós:** Reposicione nós individuais clicando e arrastando-os.
*   **Destaque de Conexões:** Passe o mouse sobre um nó para destacar ele e suas conexões diretas.
*   **Layout de Força:** Utiliza o layout de força do D3.js para posicionar os nós de forma orgânica.
*   **Responsivo:** A visualização tenta se adaptar ao tamanho da janela.


## 📝 Formato de Entrada

Use a área de texto para definir as conexões do seu grafo. Cada linha deve representar uma única conexão direta no formato:
Use code with caution.
Markdown
nó_origem -> nó_destino

*   **`nó_origem`**: O nome do nó de onde a conexão se origina.
*   **`->`**: O separador que indica a direção da conexão.
*   **`nó_destino`**: O nome do nó para onde a conexão aponta.

**Exemplo:**
Use code with caution.
Servidor Web -> API Gateway
API Gateway -> Serviço de Autenticação
API Gateway -> Serviço de Produtos
Serviço de Autenticação -> Banco de Dados de Usuários
Serviço de Produtos -> Banco de Dados de Produtos
Cliente App -> Servidor Web
Cliente App -> API Gateway

*   Espaços em branco antes/depois dos nomes dos nós e do `->` são ignorados.
*   Linhas em branco ou que não contêm `->` são ignoradas.
*   Nós são criados automaticamente com base nos nomes fornecidos.

## 🛠️ Tecnologias Utilizadas

*   **HTML5**
*   **CSS3** (com Variáveis CSS / Propriedades Customizadas)
*   **JavaScript** (ES6+)
*   **D3.js (v7)**: A biblioteca principal para manipulação de dados e visualização SVG.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir *issues* para reportar bugs ou sugerir melhorias, ou *pull requests* com correções e novas funcionalidades.
