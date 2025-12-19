package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"cmdimport/backend/models"
	"cmdimport/backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SaleHandler struct {
	DB *gorm.DB
}

func NewSaleHandler(db *gorm.DB) *SaleHandler {
	return &SaleHandler{DB: db}
}

type CreateSaleRequest struct {
	ClienteNome     string                   `json:"clienteNome" binding:"required"`
	Telefone        string                   `json:"telefone" binding:"required"`
	Endereco        string                   `json:"endereco" binding:"required"`
	Produtos        []SaleProductRequest     `json:"produtos" binding:"required"`
	Observacoes     *string                  `json:"observacoes"`
	UsuarioID       int                      `json:"usuarioId" binding:"required"`
	FormaPagamento  string                   `json:"formaPagamento"`
	ValorPix        *float64                 `json:"valorPix"`
	ValorCartao     *float64                 `json:"valorCartao"`
	ValorDinheiro   *float64                 `json:"valorDinheiro"`
	FotoProduto     *string                  `json:"fotoProduto"`
	TipoCliente     *string                  `json:"tipoCliente"`
}

type SaleProductRequest struct {
	Produto                string  `json:"produto" binding:"required"`
	Nome                   string  `json:"nome"`
	Quantidade             string  `json:"quantidade" binding:"required"`
	UsarPrecoPersonalizado bool    `json:"usarPrecoPersonalizado"`
	PrecoPersonalizado     *string `json:"precoPersonalizado"`
}

func (h *SaleHandler) Cadastrar(c *gin.Context) {
	var req CreateSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Todos os campos obrigatórios devem ser preenchidos",
		})
		return
	}

	if len(req.Produtos) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Pelo menos um produto deve ser informado",
		})
		return
	}

	// Buscar usuário vendedor
	var vendedor models.Usuario
	if err := h.DB.First(&vendedor, req.UsuarioID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Usuário não encontrado",
		})
		return
	}

	// Validar e buscar produtos no estoque
	type ProdutoEstoqueComVenda struct {
		Estoque          models.Estoque
		QuantidadeVendida int
	}

	produtosEstoque := make([]ProdutoEstoqueComVenda, 0)

	for _, produtoReq := range req.Produtos {
		estoqueID, err := strconv.Atoi(produtoReq.Produto)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": fmt.Sprintf("ID de produto inválido: %s", produtoReq.Produto),
			})
			return
		}

		var estoque models.Estoque
		if err := h.DB.Where("id = ? AND ativo = ? AND quantidade > ?", estoqueID, true, 0).
			Preload("ProdutoComprado").
			First(&estoque).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"message": fmt.Sprintf("Produto %s não encontrado no estoque", produtoReq.Nome),
			})
			return
		}

		quantidadeVendida, err := strconv.Atoi(produtoReq.Quantidade)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Quantidade inválida",
			})
			return
		}

		if estoque.Quantidade < quantidadeVendida {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": fmt.Sprintf("Quantidade insuficiente em estoque para %s", produtoReq.Nome),
			})
			return
		}

		produtosEstoque = append(produtosEstoque, ProdutoEstoqueComVenda{
			Estoque:          estoque,
			QuantidadeVendida: quantidadeVendida,
		})
	}

	// Calcular valores
	var valorTotal float64
	produtosComPrecos := make([]map[string]interface{}, 0)

	for i, produtoReq := range req.Produtos {
		var precoUnitario float64

		if produtoReq.UsarPrecoPersonalizado && produtoReq.PrecoPersonalizado != nil {
			// Parse do preço personalizado (remover formatação)
			precoStr := *produtoReq.PrecoPersonalizado
			precoStr = removeFormatting(precoStr)
			var err error
			precoUnitario, err = utils.ParseFloatBR(precoStr)
			if err != nil {
				precoUnitario = produtosEstoque[i].Estoque.ProdutoComprado.Preco
			}
		} else {
			precoUnitario = produtosEstoque[i].Estoque.ProdutoComprado.Preco
		}

		quantidade, _ := strconv.Atoi(produtoReq.Quantidade)
		subtotal := precoUnitario * float64(quantidade)
		valorTotal += subtotal

		produtosComPrecos = append(produtosComPrecos, map[string]interface{}{
			"produto":       produtoReq.Produto,
			"nome":          produtoReq.Nome,
			"quantidade":    quantidade,
			"precoUnitario": precoUnitario,
			"subtotal":      subtotal,
		})
	}

	// Gerar ID único para a venda
	vendaID := fmt.Sprintf("venda_%d_%s", time.Now().Unix(), randomString(9))

	// Criar registros no histórico
	historicoVendas := make([]models.HistoricoVenda, 0)

	for i, produtoComPreco := range produtosComPrecos {
		produtoEstoque := produtosEstoque[i]
		quantidade := int(produtoComPreco["quantidade"].(int))
		precoUnitario := produtoComPreco["precoUnitario"].(float64)
		subtotal := produtoComPreco["subtotal"].(float64)

		historicoVenda := models.HistoricoVenda{
			VendaID:        &vendaID,
			ClienteNome:    req.ClienteNome,
			Telefone:       req.Telefone,
			Endereco:       req.Endereco,
			ProdutoNome:    produtoEstoque.Estoque.ProdutoComprado.Nome,
			Quantidade:     quantidade,
			PrecoUnitario:  precoUnitario,
			ValorTotal:     valorTotal,  // Valor total da venda completa
			Observacoes:    req.Observacoes,
			VendedorNome:   vendedor.Nome,
			VendedorEmail:  vendedor.Email,
			FormaPagamento: req.FormaPagamento,
			ValorPix:       req.ValorPix,
			ValorCartao:    req.ValorCartao,
			ValorDinheiro:  req.ValorDinheiro,
			FotoProduto:    req.FotoProduto,
			TipoCliente:    req.TipoCliente,
			EstoqueID:      produtoEstoque.Estoque.ID,
			UsuarioID:      req.UsuarioID,
		}

		if err := h.DB.Create(&historicoVenda).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Erro ao registrar venda",
			})
			return
		}

		historicoVendas = append(historicoVendas, historicoVenda)
	}

	// Atualizar estoque
	for _, produtoEstoque := range produtosEstoque {
		h.DB.Model(&produtoEstoque.Estoque).
			Update("quantidade", produtoEstoque.Estoque.Quantidade-produtoEstoque.QuantidadeVendida)
	}

	// Formatar resposta
	produtosResposta := make([]map[string]interface{}, len(produtosComPrecos))
	for i, p := range produtosComPrecos {
		produtosResposta[i] = map[string]interface{}{
			"id":            p["produto"],
			"nome":          p["nome"],
			"quantidade":    p["quantidade"],
			"precoUnitario": p["precoUnitario"],
			"subtotal":      p["subtotal"],
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Venda cadastrada com sucesso!",
		"data": map[string]interface{}{
			"venda": map[string]interface{}{
				"clienteNome": req.ClienteNome,
				"produtos":    produtosResposta,
				"valorTotal":  valorTotal,
			},
		},
	})
}

func (h *SaleHandler) Historico(c *gin.Context) {
	// Parâmetros
	pagina, _ := strconv.Atoi(c.DefaultQuery("pagina", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limite", "10"))
	ordenacao := c.DefaultQuery("ordenacao", "data")
	usuarioID := c.Query("usuarioId")
	cliente := c.Query("cliente")
	dataInicio := c.Query("dataInicio")
	dataFim := c.Query("dataFim")

	offset := (pagina - 1) * limite

	query := h.DB.Model(&models.HistoricoVenda{})

	// Filtro por usuário
	if usuarioID != "" {
		usuarioIDInt, err := strconv.Atoi(usuarioID)
		if err == nil {
			query = query.Where("usuarioId = ?", usuarioIDInt)
		}
	}

	// Filtro por cliente
	if cliente != "" {
		query = query.Where("clienteNome LIKE ?", "%"+cliente+"%")
	}

	// Filtro por data
	if dataInicio != "" {
		query = query.Where("createdAt >= ?", dataInicio)
	}
	if dataFim != "" {
		query = query.Where("createdAt <= ?", dataFim+" 23:59:59")
	}

	// Contar total
	var total int64
	query.Count(&total)
	totalPaginas := int((total + int64(limite) - 1) / int64(limite))

	// Ordenação
	orderBy := "createdAt DESC" // Padrão: mais recente primeiro
	switch ordenacao {
	case "mais-recente", "data":
		orderBy = "createdAt DESC"
	case "mais-antigo":
		orderBy = "createdAt ASC"
	case "maior-valor", "valor":
		orderBy = "valorTotal DESC"
	case "menor-valor":
		orderBy = "valorTotal ASC"
	}

	// Buscar vendas ordenadas por data/hora (mais recente primeiro por padrão)
	var historico []models.HistoricoVenda
	if err := query.Preload("Usuario").
		Preload("Estoque.ProdutoComprado").
		Order(orderBy).
		Offset(offset).
		Limit(limite * 10). // Buscar mais registros para agrupar corretamente
		Find(&historico).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar histórico",
		})
		return
	}

	// Agrupar por vendaId mantendo a ordem
	type VendaAgrupada struct {
		VendaID string
		Data    time.Time
		Valor   float64
		Venda   *map[string]interface{}
	}
	vendasAgrupadas := make(map[string]*VendaAgrupada)
	var ordemVendas []string // Manter ordem das vendas

	for _, venda := range historico {
		vendaID := ""
		if venda.VendaID != nil {
			vendaID = *venda.VendaID
		} else {
			// Se não tem vendaId, usar ID único
			vendaID = fmt.Sprintf("venda_%d", venda.ID)
		}

		if _, exists := vendasAgrupadas[vendaID]; !exists {
			// Calcular valor total somando todos os produtos da venda
			var valorTotal float64
			var primeiraVenda models.HistoricoVenda
			if err := h.DB.Where("vendaId = ?", vendaID).Order("createdAt DESC").First(&primeiraVenda).Error; err == nil {
				// Somar todos os valores da venda
				var todasVendas []models.HistoricoVenda
				h.DB.Where("vendaId = ?", vendaID).Find(&todasVendas)
				for _, v := range todasVendas {
					valorTotal += v.ValorTotal
				}
			} else {
				// Se não encontrou, usar o valor da venda atual
				valorTotal = venda.ValorTotal
			}

			vendaMap := map[string]interface{}{
				"vendaId":        vendaID,
				"clienteNome":    venda.ClienteNome,
				"telefone":       venda.Telefone,
				"endereco":       venda.Endereco,
				"observacoes":    venda.Observacoes,
				"vendedorNome":   venda.VendedorNome,
				"vendedorEmail":  venda.VendedorEmail,
				"createdAt":      venda.CreatedAt.Format(time.RFC3339),
				"fotoProduto":     venda.FotoProduto,
				"formaPagamento": venda.FormaPagamento,
				"valorPix":       venda.ValorPix,
				"valorCartao":    venda.ValorCartao,
				"valorDinheiro":  venda.ValorDinheiro,
				"tipoCliente":    venda.TipoCliente,
				"produtos":       []map[string]interface{}{},
				"valorTotal":     valorTotal,
			}
			vendasAgrupadas[vendaID] = &VendaAgrupada{
				VendaID: vendaID,
				Data:    venda.CreatedAt,
				Valor:   valorTotal,
				Venda:   &vendaMap,
			}
			ordemVendas = append(ordemVendas, vendaID)
		}

		produtoMap := map[string]interface{}{
			"id":            venda.ID,
			"produtoNome":   venda.ProdutoNome,
			"quantidade":    venda.Quantidade,
			"precoUnitario": venda.PrecoUnitario,
		}

		if venda.Estoque.ProdutoComprado.IMEI != nil {
			produtoMap["produtoDetalhes"] = map[string]interface{}{
				"imei":       venda.Estoque.ProdutoComprado.IMEI,
				"cor":        venda.Estoque.ProdutoComprado.Cor,
				"descricao":  venda.Estoque.ProdutoComprado.Descricao,
			}
		}

		produtos := (*vendasAgrupadas[vendaID].Venda)["produtos"].([]map[string]interface{})
		produtos = append(produtos, produtoMap)
		(*vendasAgrupadas[vendaID].Venda)["produtos"] = produtos
	}

	// Converter para array mantendo a ordem
	vendasFormatadas := make([]map[string]interface{}, 0, len(vendasAgrupadas))
	for _, vendaID := range ordemVendas {
		if vendaAgrupada, exists := vendasAgrupadas[vendaID]; exists {
			vendasFormatadas = append(vendasFormatadas, *vendaAgrupada.Venda)
		}
	}

	// Aplicar ordenação final baseada no tipo de ordenação solicitado
	switch ordenacao {
	case "mais-recente", "data":
		// Já está ordenado por data DESC (mais recente primeiro)
	case "mais-antigo":
		// Reverter para mais antigo primeiro
		for i, j := 0, len(vendasFormatadas)-1; i < j; i, j = i+1, j-1 {
			vendasFormatadas[i], vendasFormatadas[j] = vendasFormatadas[j], vendasFormatadas[i]
		}
	case "maior-valor", "valor":
		// Ordenar por valor total DESC
		for i := 0; i < len(vendasFormatadas)-1; i++ {
			for j := i + 1; j < len(vendasFormatadas); j++ {
				valI := vendasFormatadas[i]["valorTotal"].(float64)
				valJ := vendasFormatadas[j]["valorTotal"].(float64)
				if valI < valJ {
					vendasFormatadas[i], vendasFormatadas[j] = vendasFormatadas[j], vendasFormatadas[i]
				}
			}
		}
	case "menor-valor":
		// Ordenar por valor total ASC
		for i := 0; i < len(vendasFormatadas)-1; i++ {
			for j := i + 1; j < len(vendasFormatadas); j++ {
				valI := vendasFormatadas[i]["valorTotal"].(float64)
				valJ := vendasFormatadas[j]["valorTotal"].(float64)
				if valI > valJ {
					vendasFormatadas[i], vendasFormatadas[j] = vendasFormatadas[j], vendasFormatadas[i]
				}
			}
		}
	}

	// Limitar ao número de itens solicitado
	if len(vendasFormatadas) > limite {
		vendasFormatadas = vendasFormatadas[:limite]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    vendasFormatadas,
		"paginacao": gin.H{
			"paginaAtual":  pagina,
			"totalPaginas": totalPaginas,
			"total":        total,
			"limite":       limite,
		},
	})
}

func (h *SaleHandler) HistoricoAdmin(c *gin.Context) {
	// Parâmetros
	pagina, _ := strconv.Atoi(c.DefaultQuery("pagina", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limite", "10"))
	ordenacao := c.DefaultQuery("ordenacao", "data")
	cliente := c.Query("cliente")
	imeiCodigo := c.Query("imeiCodigo")
	dataInicio := c.Query("dataInicio")
	dataFim := c.Query("dataFim")

	offset := (pagina - 1) * limite

	query := h.DB.Model(&models.HistoricoVenda{})

	// Filtro por cliente
	if cliente != "" {
		query = query.Where("clienteNome LIKE ?", "%"+cliente+"%")
	}

	// Filtro por IMEI/código de barras
	if imeiCodigo != "" {
		query = query.Joins("JOIN Estoque ON HistoricoVenda.estoqueId = Estoque.id").
			Joins("JOIN ProdutoComprado ON Estoque.produtoCompradoId = ProdutoComprado.id").
			Where("ProdutoComprado.imei LIKE ? OR ProdutoComprado.codigoBarras LIKE ?", "%"+imeiCodigo+"%", "%"+imeiCodigo+"%")
	}

	// Filtro por data
	if dataInicio != "" {
		query = query.Where("HistoricoVenda.createdAt >= ?", dataInicio)
	}
	if dataFim != "" {
		query = query.Where("HistoricoVenda.createdAt <= ?", dataFim+" 23:59:59")
	}

	// Contar total
	var total int64
	query.Count(&total)
	totalPaginas := int((total + int64(limite) - 1) / int64(limite))

	// Ordenação
	orderBy := "HistoricoVenda.createdAt DESC"
	if ordenacao == "valor" {
		orderBy = "HistoricoVenda.valorTotal DESC"
	} else if ordenacao == "vendedor" {
		orderBy = "HistoricoVenda.vendedorNome ASC"
	}

	// Buscar vendas
	var historico []models.HistoricoVenda
	if err := query.Preload("Usuario").
		Preload("Estoque.ProdutoComprado").
		Order(orderBy).
		Offset(offset).
		Limit(limite).
		Find(&historico).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar histórico",
		})
		return
	}

	// Agrupar por vendaId
	vendasAgrupadas := make(map[string]*map[string]interface{})

	for _, venda := range historico {
		// Se há filtro por IMEI/código, verificar se corresponde
		if imeiCodigo != "" {
			corresponde := false
			if venda.Estoque.ProdutoComprado.IMEI != nil {
				corresponde = contains(*venda.Estoque.ProdutoComprado.IMEI, imeiCodigo)
			}
			if !corresponde && venda.Estoque.ProdutoComprado.CodigoBarras != nil {
				corresponde = contains(*venda.Estoque.ProdutoComprado.CodigoBarras, imeiCodigo)
			}
			if !corresponde {
				continue
			}
		}

		vendaID := ""
		if venda.VendaID != nil {
			vendaID = *venda.VendaID
		}

		if _, exists := vendasAgrupadas[vendaID]; !exists {
			valorTotal := 0.0
			var primeiraVenda models.HistoricoVenda
			if err := h.DB.Where("vendaId = ?", vendaID).First(&primeiraVenda).Error; err == nil {
				valorTotal = primeiraVenda.ValorTotal
			}

			vendaMap := map[string]interface{}{
				"vendaId":        vendaID,
				"clienteNome":    venda.ClienteNome,
				"telefone":       venda.Telefone,
				"endereco":       venda.Endereco,
				"observacoes":    venda.Observacoes,
				"vendedorNome":   venda.VendedorNome,
				"vendedorEmail":  venda.VendedorEmail,
				"createdAt":      venda.CreatedAt.Format(time.RFC3339),
				"fotoProduto":     venda.FotoProduto,
				"formaPagamento": venda.FormaPagamento,
				"valorPix":       venda.ValorPix,
				"valorCartao":    venda.ValorCartao,
				"valorDinheiro":  venda.ValorDinheiro,
				"tipoCliente":    venda.TipoCliente,
				"produtos":       []map[string]interface{}{},
				"valorTotal":     valorTotal,
			}
			vendasAgrupadas[vendaID] = &vendaMap
		}

		produtoMap := map[string]interface{}{
			"id":            venda.ID,
			"produtoId":     nil,
			"produtoNome":   venda.ProdutoNome,
			"quantidade":    venda.Quantidade,
			"precoUnitario": venda.PrecoUnitario,
		}

		if venda.Estoque.ProdutoComprado.ID > 0 {
			produtoMap["produtoId"] = venda.Estoque.ProdutoComprado.ID
		}

		if venda.Estoque.ProdutoComprado.IMEI != nil || venda.Estoque.ProdutoComprado.Cor != nil {
			detalhes := make(map[string]interface{})
			if venda.Estoque.ProdutoComprado.IMEI != nil {
				detalhes["imei"] = *venda.Estoque.ProdutoComprado.IMEI
			}
			if venda.Estoque.ProdutoComprado.CodigoBarras != nil {
				detalhes["codigoBarras"] = *venda.Estoque.ProdutoComprado.CodigoBarras
			}
			if venda.Estoque.ProdutoComprado.Cor != nil {
				detalhes["cor"] = *venda.Estoque.ProdutoComprado.Cor
			}
			if venda.Estoque.ProdutoComprado.Descricao != nil {
				detalhes["descricao"] = *venda.Estoque.ProdutoComprado.Descricao
			}
			produtoMap["produtoDetalhes"] = detalhes
		}

		produtos := (*vendasAgrupadas[vendaID])["produtos"].([]map[string]interface{})
		produtos = append(produtos, produtoMap)
		(*vendasAgrupadas[vendaID])["produtos"] = produtos
	}

	// Converter map para array e filtrar vendas sem produtos (quando há filtro por IMEI/código)
	vendasFormatadas := make([]map[string]interface{}, 0)
	for _, venda := range vendasAgrupadas {
		if imeiCodigo != "" && len((*venda)["produtos"].([]map[string]interface{})) == 0 {
			continue
		}
		vendasFormatadas = append(vendasFormatadas, *venda)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    vendasFormatadas,
		"paginacao": gin.H{
			"paginaAtual":  pagina,
			"totalPaginas": totalPaginas,
			"total":        total,
			"limite":       limite,
		},
	})
}

func (h *SaleHandler) ResumoVendedores(c *gin.Context) {
	dataInicio := c.Query("dataInicio")
	dataFim := c.Query("dataFim")

	query := h.DB.Model(&models.HistoricoVenda{})

	// Filtro por data
	if dataInicio != "" {
		query = query.Where("createdAt >= ?", dataInicio)
	}
	if dataFim != "" {
		query = query.Where("createdAt <= ?", dataFim+" 23:59:59")
	}

	var vendas []models.HistoricoVenda
	if err := query.Select("vendedorNome, vendedorEmail, valorTotal, quantidade, produtoNome").
		Find(&vendas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar resumo",
		})
		return
	}

	// Agrupar por vendedor
	resumoPorVendedor := make(map[string]*map[string]interface{})
	produtosUnicos := make(map[string]map[string]bool)

	for _, venda := range vendas {
		chave := venda.VendedorEmail

		if _, exists := resumoPorVendedor[chave]; !exists {
			resumoMap := map[string]interface{}{
				"vendedorNome":      venda.VendedorNome,
				"vendedorEmail":      venda.VendedorEmail,
				"totalVendas":        0,
				"totalValor":         0.0,
				"quantidadeProdutos": 0,
			}
			resumoPorVendedor[chave] = &resumoMap
			produtosUnicos[chave] = make(map[string]bool)
		}

		(*resumoPorVendedor[chave])["totalVendas"] = (*resumoPorVendedor[chave])["totalVendas"].(int) + 1
		(*resumoPorVendedor[chave])["totalValor"] = (*resumoPorVendedor[chave])["totalValor"].(float64) + venda.ValorTotal
		(*resumoPorVendedor[chave])["quantidadeProdutos"] = (*resumoPorVendedor[chave])["quantidadeProdutos"].(int) + venda.Quantidade

		// Contar produtos únicos
		if !produtosUnicos[chave][venda.ProdutoNome] {
			produtosUnicos[chave][venda.ProdutoNome] = true
		}
	}

	// Converter para array e adicionar quantidade de produtos únicos
	resumoArray := make([]map[string]interface{}, 0, len(resumoPorVendedor))
	for _, resumo := range resumoPorVendedor {
		email := (*resumo)["vendedorEmail"].(string)
		(*resumo)["quantidadeProdutos"] = len(produtosUnicos[email])
		resumoArray = append(resumoArray, *resumo)
	}

	// Ordenar por valor total (maior primeiro)
	for i := 0; i < len(resumoArray)-1; i++ {
		for j := i + 1; j < len(resumoArray); j++ {
			if resumoArray[i]["totalValor"].(float64) < resumoArray[j]["totalValor"].(float64) {
				resumoArray[i], resumoArray[j] = resumoArray[j], resumoArray[i]
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resumoArray,
	})
}

func (h *SaleHandler) BuscarPorID(c *gin.Context) {
	id := c.Param("id")
	vendaIDInt, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID da venda inválido",
		})
		return
	}

	// Buscar venda inicial
	var vendaInicial models.HistoricoVenda
	if err := h.DB.First(&vendaInicial, vendaIDInt).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Venda não encontrada",
		})
		return
	}

	// Buscar todas as vendas do mesmo vendaId
	var vendas []models.HistoricoVenda
	vendaIDStr := ""
	if vendaInicial.VendaID != nil {
		vendaIDStr = *vendaInicial.VendaID
	}

	if err := h.DB.Where("vendaId = ?", vendaIDStr).
		Preload("Usuario").
		Preload("Estoque.ProdutoComprado").
		Order("id ASC").
		Find(&vendas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar venda",
		})
		return
	}

	if len(vendas) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Venda não encontrada",
		})
		return
	}

	vendaBase := vendas[0]

	// Formatar produtos
	produtos := make([]map[string]interface{}, len(vendas))
	for i, venda := range vendas {
		produtoMap := map[string]interface{}{
			"id":            venda.ID,
			"produtoNome":   venda.ProdutoNome,
			"quantidade":    venda.Quantidade,
			"precoUnitario": venda.PrecoUnitario,
		}

		if venda.Estoque.ProdutoComprado.IMEI != nil || venda.Estoque.ProdutoComprado.Cor != nil {
			detalhes := make(map[string]interface{})
			if venda.Estoque.ProdutoComprado.IMEI != nil {
				detalhes["imei"] = *venda.Estoque.ProdutoComprado.IMEI
			}
			if venda.Estoque.ProdutoComprado.Cor != nil {
				detalhes["cor"] = *venda.Estoque.ProdutoComprado.Cor
			}
			if venda.Estoque.ProdutoComprado.Descricao != nil {
				detalhes["descricao"] = *venda.Estoque.ProdutoComprado.Descricao
			}
			produtoMap["produtoDetalhes"] = detalhes
		}

		produtos[i] = produtoMap
	}

	// Calcular valor total somando todos os produtos
	valorTotalCalculado := 0.0
	for _, venda := range vendas {
		valorTotalCalculado += venda.PrecoUnitario * float64(venda.Quantidade)
	}

	vendaFormatada := map[string]interface{}{
		"vendaId":        vendaIDStr,
		"clienteNome":    vendaBase.ClienteNome,
		"telefone":       vendaBase.Telefone,
		"endereco":       vendaBase.Endereco,
		"observacoes":    vendaBase.Observacoes,
		"vendedorNome":   vendaBase.VendedorNome,
		"vendedorEmail":  vendaBase.VendedorEmail,
		"createdAt":      vendaBase.CreatedAt.Format(time.RFC3339),
		"fotoProduto":    vendaBase.FotoProduto,
		"formaPagamento": vendaBase.FormaPagamento,
		"valorPix":       vendaBase.ValorPix,
		"valorCartao":    vendaBase.ValorCartao,
		"valorDinheiro":  vendaBase.ValorDinheiro,
		"produtos":       produtos,
		"valorTotal":     valorTotalCalculado,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    vendaFormatada,
	})
}

func (h *SaleHandler) BuscarPorIDAdmin(c *gin.Context) {
	// Mesma implementação do BuscarPorID
	h.BuscarPorID(c)
}

// Funções auxiliares
func removeFormatting(s string) string {
	// Remove tudo exceto números, vírgula e ponto
	result := ""
	for _, char := range s {
		if (char >= '0' && char <= '9') || char == ',' || char == '.' {
			result += string(char)
		}
	}
	return result
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	// Usar crypto/rand para maior segurança (já importado em utils/password.go)
	// Mas como não está importado aqui, usar math/rand sem Seed (Go 1.20+ não precisa)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func contains(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(s) < len(substr) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// TrocarProduto substitui um produto em uma venda
func (h *SaleHandler) TrocarProduto(c *gin.Context) {
	var req struct {
		HistoricoVendaID int `json:"historicoVendaId" binding:"required"`
		NovoEstoqueID    int `json:"novoEstoqueId" binding:"required"`
		PrecoUnitario    float64 `json:"precoUnitario"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados obrigatórios não fornecidos",
		})
		return
	}

	// Buscar registro da venda original
	var historicoVenda models.HistoricoVenda
	if err := h.DB.Preload("Estoque").
		Preload("Estoque.ProdutoComprado").
		First(&historicoVenda, req.HistoricoVendaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Registro de venda não encontrado",
		})
		return
	}

	// Buscar o novo produto de estoque
	var novoEstoque models.Estoque
	if err := h.DB.Where("id = ? AND ativo = ?", req.NovoEstoqueID, true).
		Preload("ProdutoComprado").
		First(&novoEstoque).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Novo produto não encontrado no estoque",
		})
		return
	}

	// Verificar se há quantidade disponível do novo produto
	if novoEstoque.Quantidade < historicoVenda.Quantidade {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Quantidade insuficiente do novo produto em estoque",
		})
		return
	}

	// Iniciar transação
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Devolver o produto antigo ao estoque
		if err := tx.Model(&historicoVenda.Estoque).
			Update("quantidade", gorm.Expr("quantidade + ?", historicoVenda.Quantidade)).Error; err != nil {
			return err
		}

		// 2. Retirar o novo produto do estoque
		if err := tx.Model(&novoEstoque).
			Update("quantidade", gorm.Expr("quantidade - ?", historicoVenda.Quantidade)).Error; err != nil {
			return err
		}

		// 3. Calcular novo preço se fornecido, senão usar o preço do produto
		novoPreco := req.PrecoUnitario
		if novoPreco == 0 {
			novoPreco = novoEstoque.ProdutoComprado.Preco
		}
		novoValorTotal := novoPreco * float64(historicoVenda.Quantidade)

		// 4. Atualizar o registro da venda
		updates := map[string]interface{}{
			"estoqueId":     novoEstoque.ID,
			"produtoNome":   novoEstoque.ProdutoComprado.Nome,
			"precoUnitario": novoPreco,
			"valorTotal":    novoValorTotal,
		}

		if err := tx.Model(&historicoVenda).Updates(updates).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao trocar produto: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produto trocado com sucesso",
		"data": gin.H{
			"produtoAntigo": historicoVenda.Estoque.ProdutoComprado.Nome,
			"produtoNovo":   novoEstoque.ProdutoComprado.Nome,
			"quantidade":    historicoVenda.Quantidade,
		},
	})
}

