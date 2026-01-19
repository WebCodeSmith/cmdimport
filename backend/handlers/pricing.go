package handlers

import (
	"errors"
	"net/http"
	"time"

	"cmdimport/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PricingHandler struct {
	DB *gorm.DB
}

func NewPricingHandler(db *gorm.DB) *PricingHandler {
	return &PricingHandler{DB: db}
}

// ListarCombos retorna uma lista unificada de produtos com suas precificações.
// Ele busca todos os nomes de produtos distintos do estoque e cruza com a tabela de precificação.
func (h *PricingHandler) ListarCombos(c *gin.Context) {
	// 1. Buscar todos os produtos do estoque agrupados por nome para saber quais existem
	type ProdutoAgrupado struct {
		NomeProduto       string  `gorm:"column:nome_produto"`
		TotalQuantidade   int     `gorm:"column:total_quantidade"`
		Variacoes         int     `gorm:"column:variacoes"`
		PrecoMedio        float64 `gorm:"column:preco_medio"`
		ValorTotalEstoque float64 `gorm:"column:valor_total_estoque"`
	}

	var produtosEstoque []ProdutoAgrupado
	// Esta query busca nomes distintos e soma quantidades, conta variações e calcula totais de todo o estoque
	if err := h.DB.Model(&models.ProdutoComprado{}).
		Select("nome as nome_produto, SUM(quantidade) as total_quantidade, COUNT(*) as variacoes, AVG(preco) as preco_medio, SUM(preco * quantidade) as valor_total_estoque").
		Group("nome").
		Scan(&produtosEstoque).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar produtos do estoque",
			"error":   err.Error(),
		})
		return
	}

	// 2. Buscar todas as precificações existentes
	var precificacoes []models.Precificacao
	if err := h.DB.Find(&precificacoes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar precificações",
			"error":   err.Error(),
		})
		return
	}

	// Criar um mapa para acesso rápido às precificações
	precificacoesMap := make(map[string]models.Precificacao)
	for _, p := range precificacoes {
		precificacoesMap[p.NomeProduto] = p
	}

	// 3. Montar a resposta combinando estoque e precificação
	var resultado []map[string]interface{}

	for _, p := range produtosEstoque {
		// Se não houver quantidade > 0 em lugar nenhum, talvez queiramos ignorar ou mostrar zerado.
		// Por padrão, vamos mostrar todos que estão na tabela ProdutoComprado (que teoricamente são o catálogo).
		
		item := map[string]interface{}{
			"nomeProduto":       p.NomeProduto,
			"totalQuantidade":   p.TotalQuantidade,
			"variacoes":         p.Variacoes,
			"precoMedio":        p.PrecoMedio,
			"valorTotalEstoque": p.ValorTotalEstoque,
		}


		if prec, ok := precificacoesMap[p.NomeProduto]; ok {
			item["id"] = prec.ID
			item["valorDinheiroPix"] = prec.ValorDinheiroPix
			item["valorDebito"] = prec.ValorDebito
			item["valorCartaoVista"] = prec.ValorCartaoVista
			item["valorCredito5x"] = prec.ValorCredito5x
			item["valorCredito10x"] = prec.ValorCredito10x
			item["valorCredito12x"] = prec.ValorCredito12x
			item["updatedAt"] = prec.UpdatedAt
		} else {
			// Se não existir precificação, retornamos valores zerados
			item["id"] = nil // Indica que precisará criar
			item["valorDinheiroPix"] = 0
			item["valorDebito"] = 0
			item["valorCartaoVista"] = 0
			item["valorCredito5x"] = 0
			item["valorCredito10x"] = 0
			item["valorCredito12x"] = 0
			item["updatedAt"] = nil
		}
		
		resultado = append(resultado, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resultado,
	})
}

// Atualizar ou Criar precificação para um produto
func (h *PricingHandler) Atualizar(c *gin.Context) {
	var input struct {
		NomeProduto       string  `json:"nomeProduto" binding:"required"`
		ValorDinheiroPix  float64 `json:"valorDinheiroPix"`
		ValorDebito       float64 `json:"valorDebito"`
		ValorCartaoVista  float64 `json:"valorCartaoVista"`
		ValorCredito5x    float64 `json:"valorCredito5x"`
		ValorCredito10x   float64 `json:"valorCredito10x"`
		ValorCredito12x   float64 `json:"valorCredito12x"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos",
			"error":   err.Error(),
		})
		return
	}

	// Verificar se já existe
	var precificacao models.Precificacao
	err := h.DB.Where("nomeProduto = ?", input.NomeProduto).First(&precificacao).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Criar novo registro
		novaPrecificacao := models.Precificacao{
			NomeProduto:      input.NomeProduto,
			ValorDinheiroPix: input.ValorDinheiroPix,
			ValorDebito:      input.ValorDebito,
			ValorCartaoVista: input.ValorCartaoVista,
			ValorCredito5x:   input.ValorCredito5x,
			ValorCredito10x:  input.ValorCredito10x,
			ValorCredito12x:  input.ValorCredito12x,
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}
		if err := h.DB.Create(&novaPrecificacao).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Erro ao criar precificação",
			})
			return
		}
	} else if err == nil {
		// Atualizar registro existente
		precificacao.ValorDinheiroPix = input.ValorDinheiroPix
		precificacao.ValorDebito = input.ValorDebito
		precificacao.ValorCartaoVista = input.ValorCartaoVista
		precificacao.ValorCredito5x = input.ValorCredito5x
		precificacao.ValorCredito10x = input.ValorCredito10x
		precificacao.ValorCredito12x = input.ValorCredito12x
		precificacao.UpdatedAt = time.Now()

		if err := h.DB.Save(&precificacao).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Erro ao atualizar precificação",
			})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao verificar precificação",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Precificação salva com sucesso",
	})
}
