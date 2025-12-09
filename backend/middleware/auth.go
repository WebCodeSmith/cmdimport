package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"cmdimport/backend/models"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Por enquanto, vamos usar um header simples
		// Depois podemos implementar JWT
		userID := c.GetHeader("X-User-ID")
		
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autorizado"})
			c.Abort()
			return
		}

		// Obter DB do contexto (precisa ser injetado nas rotas)
		dbInterface, exists := c.Get("db")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro de configuração"})
			c.Abort()
			return
		}

		db := dbInterface.(*gorm.DB)
		var usuario models.Usuario
		if err := db.First(&usuario, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Usuário não encontrado"})
			c.Abort()
			return
		}

		// Adicionar usuário ao contexto
		c.Set("user", usuario)
		c.Set("userID", usuario.ID)
		c.Set("isAdmin", usuario.IsAdmin)
		
		c.Next()
	}
}

