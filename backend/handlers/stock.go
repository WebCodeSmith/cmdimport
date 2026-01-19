package handlers

import (
	"net/http"
	"strconv"

	"cmdimport/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StockHandler struct {
	DB *gorm.DB
}

func NewStockHandler(db *gorm.DB) *StockHandler {
	return &StockHandler{DB: db}
}

func (h *StockHandler) Listar(c *gin.Context) {
	usuarioID := c.Query("usuarioId")
	if usuarioID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do usuário não fornecido",
		})
		return
	}

	usuarioIDInt, err := strconv.Atoi(usuarioID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do usuário inválido",
		})
		return
	}

	ocultarEstoqueZerado := c.Query("ocultarEstoqueZerado") == "true"

	query := h.DB.Where("ativo = ? AND usuarioId = ?", true, usuarioIDInt)
	
	// Filtro de estoque zerado
	if ocultarEstoqueZerado {
		query = query.Where("quantidade > ?", 0)
	}

	var estoque []models.Estoque
	if err := query.
		Preload("ProdutoComprado").
		Preload("Usuario").
		Order("produtoCompradoId ASC").
		Find(&estoque).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar estoque",
		})
		return
	}

	estoqueFormatado := make([]map[string]interface{}, len(estoque))
	for i, item := range estoque {
		itemMap := map[string]interface{}{
			"id":          item.ID,
			"nome":        item.ProdutoComprado.Nome,
			"quantidade":  item.Quantidade,
			"preco":       item.ProdutoComprado.Preco,
			"atendenteNome": item.AtendenteNome,
		}

		if item.ProdutoComprado.Descricao != nil {
			itemMap["descricao"] = *item.ProdutoComprado.Descricao
		}
		if item.ProdutoComprado.Cor != nil {
			itemMap["cor"] = *item.ProdutoComprado.Cor
		}
		if item.ProdutoComprado.IMEI != nil {
			itemMap["imei"] = *item.ProdutoComprado.IMEI
		}
		if item.ProdutoComprado.CodigoBarras != nil {
			itemMap["codigoBarras"] = *item.ProdutoComprado.CodigoBarras
		}

		if item.Usuario != nil {
			itemMap["usuario"] = map[string]interface{}{
				"id":    item.Usuario.ID,
				"nome":  item.Usuario.Nome,
				"email": item.Usuario.Email,
			}
		} else {
			itemMap["usuario"] = nil
		}

		estoqueFormatado[i] = itemMap
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    estoqueFormatado,
	})
}

func (h *StockHandler) BuscarPorCodigoBarras(c *gin.Context) {
	codigoBarras := c.Query("codigoBarras")
	usuarioID := c.Query("usuarioId")

	if codigoBarras == "" || usuarioID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Código de barras e usuário são obrigatórios",
		})
		return
	}

	usuarioIDInt, err := strconv.Atoi(usuarioID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do usuário inválido",
		})
		return
	}

	var estoque []models.Estoque
	if err := h.DB.Where("usuarioId = ? AND ativo = ?", usuarioIDInt, true).
		Preload("ProdutoComprado").
		Joins("JOIN ProdutoComprado ON Estoque.produtoCompradoId = ProdutoComprado.id").
		Where("ProdutoComprado.codigoBarras = ?", codigoBarras).
		Find(&estoque).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	if len(estoque) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	produtosFormatados := make([]map[string]interface{}, len(estoque))
	for i, item := range estoque {
		itemMap := map[string]interface{}{
			"id":         item.ID,
			"nome":       item.ProdutoComprado.Nome,
			"quantidade": item.Quantidade,
			"preco":      item.ProdutoComprado.Preco,
		}

		if item.ProdutoComprado.Cor != nil {
			itemMap["cor"] = *item.ProdutoComprado.Cor
		}
		if item.ProdutoComprado.IMEI != nil {
			itemMap["imei"] = *item.ProdutoComprado.IMEI
		}
		if item.ProdutoComprado.CodigoBarras != nil {
			itemMap["codigoBarras"] = *item.ProdutoComprado.CodigoBarras
		}
		if item.ProdutoComprado.Descricao != nil {
			itemMap["descricao"] = *item.ProdutoComprado.Descricao
		}

		produtosFormatados[i] = itemMap
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    produtosFormatados,
	})
}

func (h *StockHandler) BuscarPorIMEI(c *gin.Context) {
	imei := c.Query("imei")
	usuarioID := c.Query("usuarioId")

	if imei == "" || usuarioID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "IMEI e usuário são obrigatórios",
		})
		return
	}

	usuarioIDInt, err := strconv.Atoi(usuarioID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do usuário inválido",
		})
		return
	}

	var estoque []models.Estoque
	if err := h.DB.Where("usuarioId = ? AND ativo = ?", usuarioIDInt, true).
		Preload("ProdutoComprado").
		Joins("JOIN ProdutoComprado ON Estoque.produtoCompradoId = ProdutoComprado.id").
		Where("ProdutoComprado.imei = ?", imei).
		Find(&estoque).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	if len(estoque) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Produto não encontrado",
		})
		return
	}

	produtosFormatados := make([]map[string]interface{}, len(estoque))
	for i, item := range estoque {
		itemMap := map[string]interface{}{
			"id":         item.ID,
			"nome":       item.ProdutoComprado.Nome,
			"quantidade": item.Quantidade,
			"preco":      item.ProdutoComprado.Preco,
		}

		if item.ProdutoComprado.Cor != nil {
			itemMap["cor"] = *item.ProdutoComprado.Cor
		}
		if item.ProdutoComprado.IMEI != nil {
			itemMap["imei"] = *item.ProdutoComprado.IMEI
		}
		if item.ProdutoComprado.CodigoBarras != nil {
			itemMap["codigoBarras"] = *item.ProdutoComprado.CodigoBarras
		}
		if item.ProdutoComprado.Descricao != nil {
			itemMap["descricao"] = *item.ProdutoComprado.Descricao
		}

		produtosFormatados[i] = itemMap
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    produtosFormatados,
	})
}

func (h *StockHandler) ListarEstoqueUsuarios(c *gin.Context) {
	var usuarios []models.Usuario
	if err := h.DB.Order("nome ASC").Find(&usuarios).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar usuários",
		})
		return
	}

	estoqueUsuarios := make([]map[string]interface{}, 0)

	for _, usuario := range usuarios {
		var estoque []models.Estoque
		if err := h.DB.Where("usuarioId = ? AND ativo = ?", usuario.ID, true).
			Preload("ProdutoComprado").
			Order("produtoCompradoId ASC").
			Find(&estoque).Error; err != nil {
			continue
		}

		produtos := make([]map[string]interface{}, len(estoque))
		for i, item := range estoque {
			produtoMap := map[string]interface{}{
				"id":                item.ID,
				"produtoCompradoId": item.ProdutoCompradoID,
				"nome":              item.ProdutoComprado.Nome,
				"quantidade":        item.Quantidade,
				"preco":             item.ProdutoComprado.Preco,
			}

			if item.ProdutoComprado.Cor != nil {
				produtoMap["cor"] = *item.ProdutoComprado.Cor
			}
			if item.ProdutoComprado.IMEI != nil {
				produtoMap["imei"] = *item.ProdutoComprado.IMEI
			}
			if item.ProdutoComprado.CodigoBarras != nil {
				produtoMap["codigoBarras"] = *item.ProdutoComprado.CodigoBarras
			}
			if item.ProdutoComprado.Descricao != nil {
				produtoMap["descricao"] = *item.ProdutoComprado.Descricao
			}

			produtos[i] = produtoMap
		}

		totalQuantidade := 0
		for _, p := range produtos {
			if qtd, ok := p["quantidade"].(int); ok {
				totalQuantidade += qtd
			}
		}

		estoqueUsuarios = append(estoqueUsuarios, map[string]interface{}{
			"id":            usuario.ID,
			"nome":          usuario.Nome,
			"email":         usuario.Email,
			"isAdmin":       usuario.IsAdmin,
			"totalProdutos": len(produtos),
			"totalQuantidade": totalQuantidade,
			"produtos":      produtos,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    estoqueUsuarios,
	})
}

func (h *StockHandler) DeletarEstoque(c *gin.Context) {
	estoqueID := c.Param("id")
	if estoqueID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do estoque não fornecido",
		})
		return
	}

	estoqueIDInt, err := strconv.Atoi(estoqueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID do estoque inválido",
		})
		return
	}

	// Buscar o estoque
	var estoque models.Estoque
	if err := h.DB.First(&estoque, estoqueIDInt).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Estoque não encontrado",
		})
		return
	}

	// Deletar o estoque (desativar)
	if err := h.DB.Model(&estoque).Update("ativo", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao deletar estoque",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Estoque deletado com sucesso",
	})
}

