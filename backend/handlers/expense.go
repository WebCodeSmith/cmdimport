package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"cmdimport/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ExpenseHandler struct {
	DB *gorm.DB
}

func NewExpenseHandler(db *gorm.DB) *ExpenseHandler {
	return &ExpenseHandler{DB: db}
}

type CriarCategoriaDespesaRequest struct {
	Nome      string  `json:"nome" binding:"required"`
	Descricao *string `json:"descricao"`
}

type CriarDespesaRequest struct {
	Nome        string  `json:"nome" binding:"required"`
	Valor       float64 `json:"valor" binding:"required,min=0.01"`
	CategoriaID int     `json:"categoriaId" binding:"required"`
	Descricao   *string `json:"descricao"`
	Data        string  `json:"data" binding:"required"`
}

type AtualizarDespesaRequest struct {
	Nome        *string  `json:"nome"`
	Valor       *float64 `json:"valor"`
	CategoriaID *int     `json:"categoriaId"`
	Descricao   *string  `json:"descricao"`
	Data        *string  `json:"data"`
}

// ListarCategorias lista todas as categorias de despesas
func (h *ExpenseHandler) ListarCategorias(c *gin.Context) {
	var categorias []models.CategoriaDespesa
	if err := h.DB.Order("nome ASC").Find(&categorias).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar categorias",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categorias,
	})
}

// CriarCategoria cria uma nova categoria de despesas
func (h *ExpenseHandler) CriarCategoria(c *gin.Context) {
	var req CriarCategoriaDespesaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
		return
	}

	categoria := models.CategoriaDespesa{
		Nome:      req.Nome,
		Descricao: req.Descricao,
	}

	if err := h.DB.Create(&categoria).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao criar categoria",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    categoria,
		"message": "Categoria criada com sucesso",
	})
}

// AtualizarCategoria atualiza uma categoria de despesas
func (h *ExpenseHandler) AtualizarCategoria(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID inválido",
		})
		return
	}

	var req CriarCategoriaDespesaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Verificar se a categoria existe
	var categoria models.CategoriaDespesa
	if err := h.DB.First(&categoria, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Categoria não encontrada",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar categoria",
		})
		return
	}

	// Atualizar campos
	categoria.Nome = req.Nome
	categoria.Descricao = req.Descricao

	if err := h.DB.Save(&categoria).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao atualizar categoria",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categoria,
		"message": "Categoria atualizada com sucesso",
	})
}

// DeletarCategoria deleta uma categoria de despesas
func (h *ExpenseHandler) DeletarCategoria(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID inválido",
		})
		return
	}

	// Verificar se a categoria existe
	var categoria models.CategoriaDespesa
	if err := h.DB.First(&categoria, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Categoria não encontrada",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar categoria",
		})
		return
	}

	// Deletar todas as despesas da categoria primeiro
	if err := h.DB.Where("categoriaId = ?", id).Delete(&models.Despesa{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao deletar despesas da categoria",
		})
		return
	}

	// Deletar a categoria
	if err := h.DB.Delete(&categoria).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao deletar categoria",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Categoria deletada com sucesso",
	})
}

// ListarDespesas lista todas as despesas
func (h *ExpenseHandler) ListarDespesas(c *gin.Context) {
	categoriaID := c.Query("categoriaId")

	query := h.DB.Model(&models.Despesa{}).Preload("Categoria")

	if categoriaID != "" {
		id, err := strconv.Atoi(categoriaID)
		if err == nil {
			query = query.Where("categoriaId = ?", id)
		}
	}

	var despesas []models.Despesa
	if err := query.Order("data DESC, createdAt DESC").Find(&despesas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar despesas",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    despesas,
	})
}

// CriarDespesa cria uma nova despesa
func (h *ExpenseHandler) CriarDespesa(c *gin.Context) {
	var req CriarDespesaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Verificar se a categoria existe
	var categoria models.CategoriaDespesa
	if err := h.DB.First(&categoria, req.CategoriaID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Categoria não encontrada",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao verificar categoria",
		})
		return
	}

	// Parse da data - usar time.Date para evitar problemas de timezone
	// Parse a string no formato YYYY-MM-DD
	var ano, mes, dia int
	n, err := fmt.Sscanf(req.Data, "%d-%d-%d", &ano, &mes, &dia)
	if err != nil || n != 3 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Data inválida. Use o formato YYYY-MM-DD",
		})
		return
	}
	// Criar data no timezone local para evitar conversões do GORM
	loc, _ := time.LoadLocation("America/Sao_Paulo")
	data := time.Date(ano, time.Month(mes), dia, 12, 0, 0, 0, loc) // Meio-dia para evitar problemas de timezone

	despesa := models.Despesa{
		Nome:        req.Nome,
		Valor:       req.Valor,
		CategoriaID: req.CategoriaID,
		Descricao:   req.Descricao,
		Data:        data,
	}

	// Criar a despesa primeiro
	if err := h.DB.Create(&despesa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao criar despesa",
		})
		return
	}

	// Atualizar a data usando SQL direto com DATE() para garantir que seja salva corretamente
	// Isso evita problemas de conversão de timezone do GORM
	h.DB.Exec("UPDATE Despesa SET data = DATE(?) WHERE id = ?", req.Data, despesa.ID)

	// Carregar categoria para retornar
	h.DB.Preload("Categoria").First(&despesa, despesa.ID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    despesa,
		"message": "Despesa criada com sucesso",
	})
}

// AtualizarDespesa atualiza uma despesa existente
func (h *ExpenseHandler) AtualizarDespesa(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID inválido",
		})
		return
	}

	var req AtualizarDespesaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Verificar se a despesa existe
	var despesa models.Despesa
	if err := h.DB.First(&despesa, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Despesa não encontrada",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar despesa",
		})
		return
	}

	// Atualizar campos fornecidos
	if req.Nome != nil {
		despesa.Nome = *req.Nome
	}
	if req.Valor != nil {
		despesa.Valor = *req.Valor
	}
	if req.CategoriaID != nil {
		// Verificar se a categoria existe
		var categoria models.CategoriaDespesa
		if err := h.DB.First(&categoria, *req.CategoriaID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Categoria não encontrada",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Erro ao verificar categoria",
			})
			return
		}
		despesa.CategoriaID = *req.CategoriaID
	}
	if req.Descricao != nil {
		despesa.Descricao = req.Descricao
	}
	if req.Data != nil {
		// Parse da data - usar time.Date para evitar problemas de timezone
		var ano, mes, dia int
		_, err := fmt.Sscanf(*req.Data, "%d-%d-%d", &ano, &mes, &dia)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Data inválida. Use o formato YYYY-MM-DD",
			})
			return
		}
		// Criar data no timezone local (meio-dia para evitar problemas de conversão)
		loc, _ := time.LoadLocation("America/Sao_Paulo")
		despesa.Data = time.Date(ano, time.Month(mes), dia, 12, 0, 0, 0, loc)
		
		// Atualizar usando SQL direto com DATE() para garantir que a data seja salva corretamente
		h.DB.Exec("UPDATE Despesa SET data = DATE(?) WHERE id = ?", *req.Data, despesa.ID)
	}

	if err := h.DB.Save(&despesa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao atualizar despesa",
		})
		return
	}

	// Carregar categoria para retornar
	h.DB.Preload("Categoria").First(&despesa, despesa.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    despesa,
		"message": "Despesa atualizada com sucesso",
	})
}

// DeletarDespesa deleta uma despesa
func (h *ExpenseHandler) DeletarDespesa(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID inválido",
		})
		return
	}

	// Verificar se a despesa existe
	var despesa models.Despesa
	if err := h.DB.First(&despesa, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Despesa não encontrada",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao buscar despesa",
		})
		return
	}

	if err := h.DB.Delete(&despesa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao deletar despesa",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Despesa deletada com sucesso",
	})
}

