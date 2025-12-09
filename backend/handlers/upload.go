package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func UploadFoto(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Erro ao processar formulário",
		})
		return
	}

	file, header, err := c.Request.FormFile("foto")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nenhuma foto foi enviada",
		})
		return
	}
	defer file.Close()

	// Verificar tipo de arquivo
	contentType := header.Header.Get("Content-Type")
	allowed := strings.Contains(contentType, "image/png") || 
		strings.Contains(contentType, "image/jpeg") || 
		strings.Contains(contentType, "image/jpg")

	if !allowed {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Tipo de arquivo não permitido. Use apenas PNG ou JPG.",
		})
		return
	}

	// Verificar tamanho (máximo 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Arquivo muito grande. Tamanho máximo: 5MB",
		})
		return
	}

	// Gerar nome único
	fileExtension := filepath.Ext(header.Filename)
	if fileExtension == "" {
		// Tentar detectar extensão pelo content type
		if strings.Contains(contentType, "jpeg") || strings.Contains(contentType, "jpg") {
			fileExtension = ".jpg"
		} else if strings.Contains(contentType, "png") {
			fileExtension = ".png"
		} else {
			fileExtension = ".jpg"
		}
	}

	fileName := fmt.Sprintf("%s%s", uuid.New().String(), fileExtension)
	
	// Criar diretório se não existir
	uploadDir := filepath.Join("public", "uploads", "vendas")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao criar diretório",
		})
		return
	}

	// Caminho completo do arquivo
	filePath := filepath.Join(uploadDir, fileName)

	// Criar arquivo
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao salvar arquivo",
		})
		return
	}
	defer dst.Close()

	// Copiar conteúdo
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erro ao salvar arquivo",
		})
		return
	}

	// Retornar caminho relativo
	relativePath := fmt.Sprintf("/uploads/vendas/%s", fileName)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Foto enviada com sucesso",
		"filePath": relativePath,
	})
}

