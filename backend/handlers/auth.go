package handlers

import (
	"net/http"

	"cmdimport/backend/models"
	"cmdimport/backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB *gorm.DB
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

type LoginRequest struct {
	Email  string `json:"email" binding:"required"`
	Senha  string `json:"senha" binding:"required"`
}

type RegisterRequest struct {
	Nome    string `json:"nome" binding:"required"`
	Email   string `json:"email" binding:"required,email"`
	Senha   string `json:"senha" binding:"required"`
	IsAdmin bool   `json:"isAdmin"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Email e senha são obrigatórios"})
		return
	}

	var usuario models.Usuario
	if err := h.DB.Unscoped().Where("email = ?", req.Email).First(&usuario).Error; err != nil {
		// Sempre retornar a mesma mensagem para não vazar informações
		// (não revelar se o email existe ou não)
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Credenciais inválidas"})
		return
	}

	// Verificar senha (sempre executar, mesmo se usuário não existir, para evitar timing attacks)
	if !utils.VerifyPassword(usuario.Senha, req.Senha) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Credenciais inválidas"})
		return
	}

	// Retornar usuário sem senha
	usuario.Senha = ""
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login realizado com sucesso",
		"data": gin.H{
			"user": usuario,
		},
		"user": usuario, // Manter compatibilidade com frontend
	})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Nome, email e senha são obrigatórios"})
		return
	}

	// Verificar se email já existe
	var usuarioExistente models.Usuario
	if err := h.DB.Where("email = ?", req.Email).First(&usuarioExistente).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Email já cadastrado"})
		return
	}

	// Hash da senha
	senhaHash, err := utils.HashPassword(req.Senha)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao processar senha"})
		return
	}

	// Criar usuário
	novoUsuario := models.Usuario{
		Nome:    req.Nome,
		Email:   req.Email,
		Senha:   senhaHash,
		IsAdmin: req.IsAdmin,
	}

	if err := h.DB.Create(&novoUsuario).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao criar usuário"})
		return
	}

	// Retornar usuário sem senha
	novoUsuario.Senha = ""
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Usuário criado com sucesso",
		"data": gin.H{
			"user": novoUsuario,
		},
		"user": novoUsuario, // Manter compatibilidade com frontend
	})
}

func (h *AuthHandler) ListarUsuarios(c *gin.Context) {
	var usuarios []models.Usuario
	if err := h.DB.Find(&usuarios).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao buscar usuários"})
		return
	}

	// Remover senhas
	for i := range usuarios {
		usuarios[i].Senha = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    usuarios,
	})
}

func (h *AuthHandler) ListarAtendentes(c *gin.Context) {
	var usuarios []models.Usuario
	if err := h.DB.Where("isAdmin = ?", false).Find(&usuarios).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao buscar atendentes"})
		return
	}

	// Remover senhas
	for i := range usuarios {
		usuarios[i].Senha = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    usuarios,
	})
}

