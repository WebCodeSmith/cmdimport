package handlers

import (
	"net/http"
	"strconv"

	"cmdimport/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductCategoryHandler struct {
	DB *gorm.DB
}

func NewProductCategoryHandler(db *gorm.DB) *ProductCategoryHandler {
	return &ProductCategoryHandler{DB: db}
}

type CriarCategoriaProdutoRequest struct {
	Nome      string  `json:"nome" binding:"required"`
	Descricao *string `json:"descricao"`
	Icone     *string `json:"icone"`
	Cor       *string `json:"cor"`
}

type AtualizarCategoriaProdutoRequest struct {
	Nome      *string `json:"nome"`
	Descricao *string `json:"descricao"`
	Icone     *string `json:"icone"`
	Cor       *string `json:"cor"`
	Ativo     *bool   `json:"ativo"`
}

// ListarCategorias lista todas as categorias de produtos
func (h *ProductCategoryHandler) ListarCategorias(c *gin.Context) {
	var categorias []models.CategoriaProduto
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

// CriarCategoria cria uma nova categoria de produtos
func (h *ProductCategoryHandler) CriarCategoria(c *gin.Context) {
	var req CriarCategoriaProdutoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
		return
	}

	categoria := models.CategoriaProduto{
		Nome:      req.Nome,
		Descricao: req.Descricao,
		Icone:     req.Icone,
		Cor:       req.Cor,
		Ativo:     true,
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

// AtualizarCategoria atualiza uma categoria de produtos
func (h *ProductCategoryHandler) AtualizarCategoria(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID inválido",
		})
		return
	}

	var req AtualizarCategoriaProdutoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Verificar se a categoria existe
	var categoria models.CategoriaProduto
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

	// Atualizar campos fornecidos
	if req.Nome != nil {
		categoria.Nome = *req.Nome
	}
	if req.Descricao != nil {
		categoria.Descricao = req.Descricao
	}
	if req.Icone != nil {
		categoria.Icone = req.Icone
	}
	if req.Cor != nil {
		categoria.Cor = req.Cor
	}
	if req.Ativo != nil {
		categoria.Ativo = *req.Ativo
	}

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

// DeletarCategoria deleta uma categoria de produtos
func (h *ProductCategoryHandler) DeletarCategoria(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID inválido",
		})
		return
	}

	// Verificar se a categoria existe
	var categoria models.CategoriaProduto
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

	// Verificar se há produtos usando esta categoria
	var count int64
	h.DB.Model(&models.ProdutoComprado{}).Where("categoriaId = ?", id).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Não é possível deletar categoria com produtos associados",
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
