package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"cmdimport/backend/models"
	"cmdimport/backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductHandler struct {
	DB *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{DB: db}
}

type CadastrarProdutoRequest struct {
	Nome              string  `json:"nome" binding:"required"`
	Descricao         *string `json:"descricao"`
	Cor               *string `json:"cor"`
	IMEI              *string `json:"imei"`
	CodigoBarras      *string `json:"codigoBarras"`
	CustoDolar        float64 `json:"custoDolar" binding:"required"`
	TaxaDolar         float64 `json:"taxaDolar" binding:"required"`
	Quantidade        int     `json:"quantidade" binding:"required"`
	TipoIdentificacao string  `json:"tipoIdentificacao"`
	CategoriaID       *int    `json:"categoriaId"` // Opcional
}

func (h *ProductHandler) Listar(c *gin.Context) {
	// Parâmetros de paginação
	pagina, _ := strconv.Atoi(c.DefaultQuery("pagina", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limite", "10"))
	busca := c.Query("busca")
	dataInicio := c.Query("dataInicio")
	dataFim := c.Query("dataFim")
	ocultarEstoqueZerado := c.Query("ocultarEstoqueZerado") == "true"

	offset := (pagina - 1) * limite

	query := h.DB.Model(&models.ProdutoComprado{})

	// Filtro de busca
	if busca != "" {
		query = query.Where("nome LIKE ? OR imei LIKE ? OR codigoBarras LIKE ?", 
			"%"+busca+"%", "%"+busca+"%", "%"+busca+"%")
	}

	// Filtro de data - usar DATE() para comparar apenas a parte da data, ignorando hora
	if dataInicio != "" {
		// Usar DATE() para extrair apenas a parte da data e comparar
		query = query.Where("DATE(dataCompra) >= ?", dataInicio)
	}
	if dataFim != "" {
		// Usar DATE() para extrair apenas a parte da data e comparar
		query = query.Where("DATE(dataCompra) <= ?", dataFim)
	}

	// Filtro de categoria
	categoriaID := c.Query("categoriaId")
	if categoriaID != "" {
		id, err := strconv.Atoi(categoriaID)
		if err == nil {
			query = query.Where("categoriaId = ?", id)
		}
	}

	// Filtro de estoque zerado
	if ocultarEstoqueZerado {
		query = query.Where("quantidade > ?", 0)
	}

	// Contar total
	var total int64
	query.Count(&total)
	totalPaginas := int((total + int64(limite) - 1) / int64(limite))

	// Buscar produtos usando Select explícito para garantir que os campos sejam lidos
	var produtos []models.ProdutoComprado
	if err := query.Select("id", "nome", "descricao", "cor", "imei", "codigoBarras", 
		"custoDolar", "taxaDolar", "preco", "quantidade", "quantidadeBackup", 
		"fornecedor", "dataCompra", "createdAt", "updatedAt", 
		"valorCusto", "valorAtacado", "valorVarejo", "valorRevendaEspecial", "valorParcelado10x").
		Preload("Estoque", "ativo = ?", true).
		Preload("Estoque.Usuario").
		Order("dataCompra DESC").
		Offset(offset).
		Limit(limite).
		Find(&produtos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar produtos",
		})
		return
	}

	// Debug: verificar se os valores estão sendo lidos corretamente
	if len(produtos) > 0 {
		log.Printf("DEBUG - Primeiro produto - CustoDolar: %v, TaxaDolar: %v, Preco: %v", 
			produtos[0].CustoDolar, produtos[0].TaxaDolar, produtos[0].Preco)
	}

	// Formatar resposta
	produtosFormatados := make([]map[string]interface{}, len(produtos))
	for i, produto := range produtos {
		estoqueFormatado := make([]map[string]interface{}, len(produto.Estoque))
		for j, item := range produto.Estoque {
			estoqueFormatado[j] = map[string]interface{}{
				"id":       item.ID,
				"quantidade": item.Quantidade,
				"ativo":    item.Ativo,
			}
		}

		produtosFormatados[i] = map[string]interface{}{
			"id":                produto.ID,
			"nome":              produto.Nome,
			"descricao":         produto.Descricao,
			"cor":               produto.Cor,
			"imei":              produto.IMEI,
			"codigoBarras":      produto.CodigoBarras,
			"custoDolar":        float64(produto.CustoDolar),
			"taxaDolar":         float64(produto.TaxaDolar),
			"preco":             float64(produto.Preco),
			"quantidade":        produto.Quantidade,
			"quantidadeBackup":  produto.QuantidadeBackup,
			"fornecedor":        produto.Fornecedor,
			"dataCompra":        produto.DataCompra.Format(time.RFC3339),
			"createdAt":         produto.CreatedAt.Format(time.RFC3339),
			"valorAtacado":       produto.ValorAtacado,
			"valorVarejo":        produto.ValorVarejo,
			"valorRevendaEspecial": produto.ValorRevendaEspecial,
			"valorParcelado10x":  produto.ValorParcelado10x,
			"estoque":           estoqueFormatado,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    produtosFormatados,
		"paginacao": gin.H{
			"paginaAtual":  pagina,
			"totalPaginas": totalPaginas,
			"total":        total,
			"limite":       limite,
		},
	})
}

func (h *ProductHandler) Cadastrar(c *gin.Context) {
	var req CadastrarProdutoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados obrigatórios não fornecidos",
		})
		return
	}

	// Validações
	if req.CustoDolar <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "O custo em dólar deve ser maior que zero",
		})
		return
	}

	if req.TaxaDolar <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "A taxa do dólar deve ser maior que zero",
		})
		return
	}

	if req.Quantidade < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "A quantidade não pode ser negativa",
		})
		return
	}

	// Validação baseada no tipo de identificação
	if req.TipoIdentificacao == "imei" {
		// Modo IMEI: IMEI é obrigatório
		if req.IMEI == nil || *req.IMEI == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "O IMEI é obrigatório quando o tipo de identificação é IMEI",
			})
			return
		}
	} else if req.TipoIdentificacao == "codigoBarras" {
		// Modo Código de Barras: Código de Barras é obrigatório
		if req.CodigoBarras == nil || *req.CodigoBarras == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "O Código de Barras é obrigatório quando o tipo de identificação é Código de Barras",
			})
			return
		}
	} else if req.TipoIdentificacao == "ambos" {
		// Modo Ambos: pelo menos um deve ser preenchido
		if (req.IMEI == nil || *req.IMEI == "") && (req.CodigoBarras == nil || *req.CodigoBarras == "") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Por favor, preencha pelo menos um dos campos: IMEI ou Código de Barras",
			})
			return
		}
	}

	// Verificar IMEI duplicado se fornecido
	if req.IMEI != nil && *req.IMEI != "" && (req.TipoIdentificacao == "imei" || req.TipoIdentificacao == "ambos") {
		var produtoExistente models.ProdutoComprado
		if err := h.DB.Where("imei = ?", *req.IMEI).First(&produtoExistente).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Já existe um produto com este IMEI",
			})
			return
		}
	}

	// Calcular preço
	precoCalculado := req.CustoDolar * req.TaxaDolar

	// Criar produto
	produto := models.ProdutoComprado{
		Nome:             req.Nome,
		Descricao:        req.Descricao,
		Cor:              req.Cor,
		CustoDolar:       req.CustoDolar,
		TaxaDolar:        req.TaxaDolar,
		Preco:            precoCalculado,
		Quantidade:       req.Quantidade,
		QuantidadeBackup: req.Quantidade, // Salvar backup
		DataCompra:       time.Now(),
		CategoriaID:      req.CategoriaID, // Adicionar categoria
	}

	// Definir IMEI e código de barras baseado no tipo
	if req.TipoIdentificacao == "imei" || req.TipoIdentificacao == "ambos" {
		produto.IMEI = req.IMEI
	}
	if req.TipoIdentificacao == "codigoBarras" || req.TipoIdentificacao == "ambos" {
		produto.CodigoBarras = req.CodigoBarras
	}

	if err := h.DB.Create(&produto).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao cadastrar produto",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produto comprado com sucesso! Agora distribua para os atendentes.",
		"data": gin.H{
			"id":                produto.ID,
			"nome":              produto.Nome,
			"descricao":         produto.Descricao,
			"cor":               produto.Cor,
			"imei":              produto.IMEI,
			"codigoBarras":      produto.CodigoBarras,
			"custoDolar":        produto.CustoDolar,
			"taxaDolar":         produto.TaxaDolar,
			"preco":             produto.Preco,
			"quantidade":        produto.Quantidade,
			"fornecedor":        produto.Fornecedor,
			"dataCompra":        produto.DataCompra.Format(time.RFC3339),
			"createdAt":         produto.CreatedAt.Format(time.RFC3339),
		},
	})
}

func (h *ProductHandler) BuscarPorID(c *gin.Context) {
	id := c.Param("id")
	
	var produto models.ProdutoComprado
	if err := h.DB.Preload("Estoque").First(&produto, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    produto,
	})
}


func (h *ProductHandler) Atualizar(c *gin.Context) {
	id := c.Param("id")
	produtoID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do produto inválido",
		})
		return
	}

	// Aceitar JSON flexível (strings ou números)
	var reqRaw map[string]interface{}
	if err := c.ShouldBindJSON(&reqRaw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos",
		})
		return
	}

	// Converter para estrutura tipada
	type UpdateRequest struct {
		Nome         *string
		Descricao    *string
		Cor          *string
		IMEI         *string
		CodigoBarras *string
		CustoDolar   *float64
		TaxaDolar    *float64
		Preco         *float64
		Quantidade    *int
		Fornecedor    *string
		DataCompra    *string
		CategoriaID   *int
	}

	req := UpdateRequest{}

	// Converter campos de string
	if v, ok := reqRaw["nome"]; ok && v != nil {
		if s, ok := v.(string); ok && s != "" {
			req.Nome = &s
		}
	}
	// Descrição - aceitar string vazia ou null para permitir apagar
	if v, ok := reqRaw["descricao"]; ok {
		if v == nil {
			// Se for null explicitamente, definir como string vazia para apagar
			empty := ""
			req.Descricao = &empty
		} else if s, ok := v.(string); ok {
			req.Descricao = &s
		}
	}
	if v, ok := reqRaw["cor"]; ok && v != nil {
		if s, ok := v.(string); ok {
			req.Cor = &s
		}
	}
	if v, ok := reqRaw["imei"]; ok && v != nil {
		if s, ok := v.(string); ok {
			req.IMEI = &s
		}
	}
	if v, ok := reqRaw["codigoBarras"]; ok && v != nil {
		if s, ok := v.(string); ok {
			req.CodigoBarras = &s
		}
	}
	if v, ok := reqRaw["fornecedor"]; ok && v != nil {
		if s, ok := v.(string); ok {
			req.Fornecedor = &s
		}
	}
	if v, ok := reqRaw["dataCompra"]; ok && v != nil {
		if s, ok := v.(string); ok && s != "" {
			req.DataCompra = &s
		}
	}

	// Converter campos numéricos (aceita string ou número)
	if v, ok := reqRaw["custoDolar"]; ok && v != nil {
		if f, err := utils.ParseFloatFlexible(v); err == nil && f != nil {
			req.CustoDolar = f
		}
	}
	if v, ok := reqRaw["taxaDolar"]; ok && v != nil {
		if f, err := utils.ParseFloatFlexible(v); err == nil && f != nil {
			req.TaxaDolar = f
		}
	}
	if v, ok := reqRaw["preco"]; ok && v != nil {
		if f, err := utils.ParseFloatFlexible(v); err == nil && f != nil {
			req.Preco = f
		}
	}
	if v, ok := reqRaw["quantidade"]; ok && v != nil {
		if i, err := utils.ParseIntFlexible(v); err == nil && i != nil {
			req.Quantidade = i
		}
	}
	if v, ok := reqRaw["categoriaId"]; ok {
		if v == nil {
			// Se for null explicitamente, definir como nil para remover categoria
			req.CategoriaID = nil
		} else if i, err := utils.ParseIntFlexible(v); err == nil && i != nil {
			req.CategoriaID = i
		}
	}

	// Verificar se produto existe
	var produto models.ProdutoComprado
	if err := h.DB.First(&produto, produtoID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	// Verificar IMEI duplicado se fornecido
	if req.IMEI != nil && *req.IMEI != "" && (produto.IMEI == nil || *req.IMEI != *produto.IMEI) {
		var produtoExistente models.ProdutoComprado
		if err := h.DB.Where("imei = ? AND id != ?", *req.IMEI, produtoID).First(&produtoExistente).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Já existe um produto com este IMEI",
			})
			return
		}
	}

	// Preparar updates
	updates := make(map[string]interface{})
	if req.Nome != nil {
		updates["nome"] = *req.Nome
	}
	if req.Descricao != nil {
		if *req.Descricao == "" {
			updates["descricao"] = nil
		} else {
			updates["descricao"] = *req.Descricao
		}
	}
	if req.Cor != nil {
		if *req.Cor == "" {
			updates["cor"] = nil
		} else {
			updates["cor"] = *req.Cor
		}
	}
	if req.IMEI != nil {
		if *req.IMEI == "" {
			updates["imei"] = nil
		} else {
			updates["imei"] = *req.IMEI
		}
	}
	if req.CodigoBarras != nil {
		if *req.CodigoBarras == "" {
			updates["codigoBarras"] = nil
		} else {
			updates["codigoBarras"] = *req.CodigoBarras
		}
	}
	if req.CustoDolar != nil {
		updates["custoDolar"] = *req.CustoDolar
	}
	if req.TaxaDolar != nil {
		updates["taxaDolar"] = *req.TaxaDolar
	}
	if req.Preco != nil {
		updates["preco"] = *req.Preco
	}
	if req.Quantidade != nil {
		updates["quantidade"] = *req.Quantidade
	}
	if req.Fornecedor != nil {
		updates["fornecedor"] = *req.Fornecedor
	}
	if req.DataCompra != nil && *req.DataCompra != "" {
		dataCompra, err := time.Parse("2006-01-02", *req.DataCompra)
		if err == nil && !dataCompra.IsZero() {
			updates["dataCompra"] = dataCompra
		}
	}
	if req.CategoriaID != nil {
		updates["categoriaId"] = *req.CategoriaID
	}

	// Atualizar
	if err := h.DB.Model(&produto).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao atualizar produto",
		})
		return
	}

	// Recarregar produto atualizado
	h.DB.Preload("Estoque").First(&produto, produtoID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produto atualizado com sucesso",
		"data": gin.H{
			"id":                produto.ID,
			"nome":              produto.Nome,
			"descricao":         produto.Descricao,
			"cor":               produto.Cor,
			"imei":              produto.IMEI,
			"codigoBarras":      produto.CodigoBarras,
			"custoDolar":        produto.CustoDolar,
			"taxaDolar":         produto.TaxaDolar,
			"preco":             produto.Preco,
			"quantidade":        produto.Quantidade,
			"fornecedor":        produto.Fornecedor,
			"dataCompra":        produto.DataCompra.Format(time.RFC3339),
			"createdAt":         produto.CreatedAt.Format(time.RFC3339),
			"valorAtacado":      produto.ValorAtacado,
			"valorVarejo":       produto.ValorVarejo,
			"valorParcelado10x": produto.ValorParcelado10x,
			"estoque":           produto.Estoque,
		},
	})
}

func (h *ProductHandler) AtualizarPrecificacao(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		ValorCusto       *float64 `json:"valorCusto"`
		ValorAtacado     *float64 `json:"valorAtacado"`
		ValorVarejo      *float64 `json:"valorVarejo"`
		ValorRevendaEspecial *float64 `json:"valorRevendaEspecial"`
		ValorParcelado10x *float64 `json:"valorParcelado10x"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos",
		})
		return
	}

	var produto models.ProdutoComprado
	if err := h.DB.First(&produto, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	// Atualizar precificação
	updates := make(map[string]interface{})
	if req.ValorCusto != nil {
		updates["valorCusto"] = *req.ValorCusto
	}
	if req.ValorAtacado != nil {
		updates["valorAtacado"] = *req.ValorAtacado
	}
	if req.ValorVarejo != nil {
		updates["valorVarejo"] = *req.ValorVarejo
	}
	if req.ValorRevendaEspecial != nil {
		updates["valorRevendaEspecial"] = *req.ValorRevendaEspecial
	}
	if req.ValorParcelado10x != nil {
		updates["valorParcelado10x"] = *req.ValorParcelado10x
	}

	if err := h.DB.Model(&produto).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao atualizar precificação",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Precificação atualizada com sucesso",
		"data":    produto,
	})
}

func (h *ProductHandler) Distribuir(c *gin.Context) {
	var req struct {
		ProdutoID  int `json:"produtoId" binding:"required"`
		AtendenteID int `json:"atendenteId" binding:"required"`
		Quantidade  int `json:"quantidade" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados obrigatórios não fornecidos",
		})
		return
	}

	// Verificar produto
	var produto models.ProdutoComprado
	if err := h.DB.First(&produto, req.ProdutoID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	// Verificar atendente
	var atendente models.Usuario
	if err := h.DB.First(&atendente, req.AtendenteID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Atendente não encontrado",
		})
		return
	}

	// Verificar quantidade
	if req.Quantidade > produto.Quantidade {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Quantidade solicitada excede a quantidade disponível",
		})
		return
	}

	// Transação para garantir integridade
	var estoque models.Estoque
	
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Criar estoque
		estoque = models.Estoque{
			ProdutoCompradoID: int(req.ProdutoID),
			UsuarioID:         &atendente.ID,
			Quantidade:        req.Quantidade,
			Ativo:             true,
			AtendenteNome:     &atendente.Nome,
		}

		if err := tx.Create(&estoque).Error; err != nil {
			return err
		}

		// Atualizar quantidade do produto
		if err := tx.Model(&produto).Update("quantidade", produto.Quantidade-req.Quantidade).Error; err != nil {
			return err
		}

		// Registrar histórico
		historico := models.HistoricoDistribuicao{
			ProdutoCompradoID: int(req.ProdutoID),
			UsuarioID:         req.AtendenteID,
			Quantidade:        req.Quantidade,
			Data:             time.Now(),
		}

		if err := tx.Create(&historico).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao distribuir produto: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produto distribuído com sucesso",
		"data": gin.H{
			"id":            estoque.ID,
			"produto":       produto.Nome,
			"atendente":     atendente.Nome,
			"quantidade":    estoque.Quantidade,
			"dataDistribuicao": estoque.CreatedAt.Format(time.RFC3339),
		},
	})
}

func (h *ProductHandler) Redistribuir(c *gin.Context) {
	var req struct {
		ProdutoID       int `json:"produtoId" binding:"required"`
		UsuarioOrigemID  int `json:"usuarioOrigemId" binding:"required"`
		UsuarioDestinoID int `json:"usuarioDestinoId" binding:"required"`
		Quantidade      int `json:"quantidade" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados obrigatórios não fornecidos",
		})
		return
	}

	// Buscar estoque origem
	var estoqueOrigem models.Estoque
	if err := h.DB.Preload("ProdutoComprado").
		Where("id = ? AND usuarioId = ? AND ativo = ?", req.ProdutoID, req.UsuarioOrigemID, true).
		First(&estoqueOrigem).Error; err != nil {
		// Tentar buscar por produtoCompradoId
		if err := h.DB.Preload("ProdutoComprado").
			Where("produtoCompradoId = ? AND usuarioId = ? AND ativo = ?", req.ProdutoID, req.UsuarioOrigemID, true).
			First(&estoqueOrigem).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Produto não encontrado no estoque do vendedor origem",
			})
			return
		}
	}

	// Verificar quantidade
	if estoqueOrigem.Quantidade < req.Quantidade {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Quantidade insuficiente",
		})
		return
	}

	// Verificar usuário destino
	var usuarioDestino models.Usuario
	if err := h.DB.First(&usuarioDestino, req.UsuarioDestinoID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Usuário destino não encontrado",
		})
		return
	}

	// Transação
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Atualizar estoque origem
		if err := tx.Model(&estoqueOrigem).Update("quantidade", estoqueOrigem.Quantidade-req.Quantidade).Error; err != nil {
			return err
		}

		// Verificar se já existe estoque destino
		var estoqueDestino models.Estoque
		if err := tx.Where("produtoCompradoId = ? AND usuarioId = ? AND ativo = ?",
			estoqueOrigem.ProdutoCompradoID, req.UsuarioDestinoID, true).First(&estoqueDestino).Error; err != nil {
			// Criar novo estoque
			novoEstoque := models.Estoque{
				ProdutoCompradoID: estoqueOrigem.ProdutoCompradoID,
				UsuarioID:         &usuarioDestino.ID,
				Quantidade:        req.Quantidade,
				Ativo:             true,
				AtendenteNome:     &usuarioDestino.Nome,
			}
			return tx.Create(&novoEstoque).Error
		} else {
			// Atualizar estoque existente
			return tx.Model(&estoqueDestino).Update("quantidade", estoqueDestino.Quantidade+req.Quantidade).Error
		}
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao redistribuir produto",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produto redistribuído com sucesso",
		"data": gin.H{
			"produto":        estoqueOrigem.ProdutoComprado.Nome,
			"usuarioOrigem":  req.UsuarioOrigemID,
			"usuarioDestino": usuarioDestino.Nome,
			"quantidade":     req.Quantidade,
		},
		"usuarioDestinoNome": usuarioDestino.Nome,
	})
}

func (h *ProductHandler) Deletar(c *gin.Context) {
	id := c.Param("id")
	produtoID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do produto inválido",
		})
		return
	}

	// Buscar produto
	var produto models.ProdutoComprado
	if err := h.DB.First(&produto, produtoID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	// Deletar em transação para garantir integridade
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Deletar estoques relacionados
		if err := tx.Where("produtoCompradoId = ?", produtoID).Delete(&models.Estoque{}).Error; err != nil {
			return err
		}

		// Deletar produto
		if err := tx.Delete(&produto).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao deletar produto",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produto deletado com sucesso",
	})
}

func (h *ProductHandler) ListarHistoricoDistribuicaoGlobal(c *gin.Context) {
	var historico []models.HistoricoDistribuicao
	
	// Buscar todo o histórico, ordenado por data decrescente
	query := h.DB.Preload("ProdutoComprado").Preload("Usuario").Order("data DESC")

	// Filtros opcionais podem ser adicionados aqui (data, usuario, produto)
	if dataInicio := c.Query("dataInicio"); dataInicio != "" {
		query = query.Where("DATE(data) >= ?", dataInicio)
	}
	if dataFim := c.Query("dataFim"); dataFim != "" {
		query = query.Where("DATE(data) <= ?", dataFim)
	}

	if err := query.Find(&historico).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar histórico global",
		})
		return
	}

	// Formatar resposta
	historicoFormatado := make([]map[string]interface{}, len(historico))
	for i, item := range historico {
		historicoFormatado[i] = map[string]interface{}{
			"id":                 item.ID,
			"produtoNome":        item.ProdutoComprado.Nome,
			"produtoCor":         item.ProdutoComprado.Cor,
			"produtoImei":        item.ProdutoComprado.IMEI,
			"produtoCodigoBarras": item.ProdutoComprado.CodigoBarras,
			"atendenteNome":      item.Usuario.Nome,
			"quantidade":         item.Quantidade,
			"data":               item.Data.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    historicoFormatado,
	})
}

