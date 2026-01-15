package routes

import (
	"cmdimport/backend/config"
	"cmdimport/backend/middleware"
	"cmdimport/backend/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB, cfg *config.Config) {
	// Configurar CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.AllowOrigins
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-ID"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	// Middleware para injetar DB em todas as rotas
	router.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	// Handlers
	authHandler := handlers.NewAuthHandler(db)
	productHandler := handlers.NewProductHandler(db)
	stockHandler := handlers.NewStockHandler(db)
	saleHandler := handlers.NewSaleHandler(db)
	expenseHandler := handlers.NewExpenseHandler(db)
	productCategoryHandler := handlers.NewProductCategoryHandler(db)

	// Rotas públicas
	api := router.Group("/api")
	{
		// Autenticação
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
		}
	}

	// Rotas protegidas (requerem autenticação)
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// Histórico de Distribuição Global
		protected.GET("/admin/historico-distribuicao", productHandler.ListarHistoricoDistribuicaoGlobal)

		// Produtos
		produtos := protected.Group("/admin/produtos")
		{
			produtos.GET("", productHandler.Listar)
			produtos.POST("/cadastrar", productHandler.Cadastrar)
			produtos.GET("/:id", productHandler.BuscarPorID)
			produtos.PUT("/:id", productHandler.Atualizar)
			produtos.PUT("/:id/precificacao", productHandler.AtualizarPrecificacao)
			produtos.DELETE("/:id", productHandler.Deletar)

		}

		// Estoque
		estoque := protected.Group("/estoque")
		{
			estoque.GET("", stockHandler.Listar)
			estoque.GET("/buscar-por-codigo-barras", stockHandler.BuscarPorCodigoBarras)
			estoque.GET("/buscar-por-imei", stockHandler.BuscarPorIMEI)
		}

		// Admin - Estoque Usuários
		adminEstoque := protected.Group("/admin/estoque-usuarios")
		{
			adminEstoque.GET("", stockHandler.ListarEstoqueUsuarios)
			adminEstoque.DELETE("/:id", stockHandler.DeletarEstoque)
		}

		// Admin - Distribuir
		adminDistribuir := protected.Group("/admin/distribuir")
		{
			adminDistribuir.POST("", productHandler.Distribuir)
		}

		// Admin - Redistribuir
		adminRedistribuir := protected.Group("/admin/redistribuir")
		{
			adminRedistribuir.POST("", productHandler.Redistribuir)
		}

		// Vendas
		vendas := protected.Group("/vendas")
		{
			vendas.POST("/cadastrar", saleHandler.Cadastrar)
			vendas.GET("/historico", saleHandler.Historico)
			vendas.GET("/venda/:id", saleHandler.BuscarPorID)
		}

		// Admin - Histórico
		adminHistorico := protected.Group("/admin/historico")
		{
			adminHistorico.GET("", saleHandler.HistoricoAdmin)
			adminHistorico.GET("/resumo-vendedores", saleHandler.ResumoVendedores)
		}

		// Admin - Venda
		adminVenda := protected.Group("/admin/venda")
		{
			adminVenda.GET("/:id", saleHandler.BuscarPorIDAdmin)
			adminVenda.PUT("/:id", saleHandler.AtualizarVenda)
			adminVenda.DELETE("/:id", saleHandler.DeletarVenda)
			adminVenda.POST("/trocar-produto", saleHandler.TrocarProduto)
			adminVenda.PUT("/:id/produto/:produtoId", saleHandler.AtualizarProdutoVenda)
			adminVenda.DELETE("/:id/produto/:produtoId", saleHandler.DeletarProdutoVenda)
			adminVenda.PUT("/:id/transferir", saleHandler.TransferirVenda)
		}

		// Admin - Usuários
		adminUsuarios := protected.Group("/admin/usuarios")
		{
			adminUsuarios.GET("", authHandler.ListarUsuarios)
		}

		// Admin - Atendentes
		adminAtendentes := protected.Group("/admin/atendentes")
		{
			adminAtendentes.GET("", authHandler.ListarAtendentes)
		}

		// Admin - Categorias de Despesas
		adminCategoriasDespesa := protected.Group("/admin/categorias-despesa")
		{
			adminCategoriasDespesa.GET("", expenseHandler.ListarCategorias)
			adminCategoriasDespesa.POST("", expenseHandler.CriarCategoria)
			adminCategoriasDespesa.PUT("/:id", expenseHandler.AtualizarCategoria)
			adminCategoriasDespesa.DELETE("/:id", expenseHandler.DeletarCategoria)
		}

		// Admin - Despesas
		adminDespesas := protected.Group("/admin/despesas")
		{
			adminDespesas.GET("", expenseHandler.ListarDespesas)
			adminDespesas.POST("", expenseHandler.CriarDespesa)
			adminDespesas.PUT("/:id", expenseHandler.AtualizarDespesa)
			adminDespesas.DELETE("/:id", expenseHandler.DeletarDespesa)
		}

		// Admin - Categorias de Produtos
		adminCategoriasProduto := protected.Group("/admin/categorias-produto")
		{
			adminCategoriasProduto.GET("", productCategoryHandler.ListarCategorias)
			adminCategoriasProduto.POST("", productCategoryHandler.CriarCategoria)
			adminCategoriasProduto.PUT("/:id", productCategoryHandler.AtualizarCategoria)
			adminCategoriasProduto.DELETE("/:id", productCategoryHandler.DeletarCategoria)
		}
	}

	// Upload
	api.POST("/upload/foto", handlers.UploadFoto)
}

