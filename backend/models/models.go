package models

import (
	"time"
)

// Usuario representa um usuário do sistema
type Usuario struct {
	ID             int            `gorm:"primaryKey" json:"id"`
	Nome           string         `gorm:"type:varchar(255);not null" json:"nome"`
	Email          string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Senha          string         `gorm:"type:varchar(255);not null" json:"-"` // Não serializar senha
	IsAdmin        bool           `gorm:"default:false;column:isAdmin" json:"isAdmin"`
	CreatedAt      time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
	HistoricoVendas []HistoricoVenda `gorm:"foreignKey:UsuarioID" json:"-"`
	Estoque        []Estoque      `gorm:"foreignKey:UsuarioID" json:"-"`
	HistoricoDistribuicao []HistoricoDistribuicao `gorm:"foreignKey:UsuarioID" json:"-"`
}

// TableName especifica o nome da tabela no banco (com U maiúsculo)
func (Usuario) TableName() string {
	return "Usuario"
}

// ProdutoComprado representa um produto comprado
type ProdutoComprado struct {
	ID                int            `gorm:"primaryKey" json:"id"`
	Nome              string         `gorm:"not null" json:"nome"`
	Descricao         *string        `json:"descricao"`
	Cor               *string        `json:"cor"`
	IMEI              *string        `gorm:"type:varchar(255);uniqueIndex" json:"imei"`
	CodigoBarras      *string        `gorm:"column:codigoBarras" json:"codigoBarras"`
	CustoDolar        float64        `gorm:"type:decimal(10,2);not null;column:custoDolar" json:"custoDolar"`
	TaxaDolar         float64        `gorm:"type:decimal(10,4);not null;column:taxaDolar" json:"taxaDolar"`
	Preco             float64        `gorm:"type:decimal(10,2);not null;column:preco" json:"preco"`
	Quantidade        int            `gorm:"default:0" json:"quantidade"`
	QuantidadeBackup  int            `gorm:"default:0;column:quantidadeBackup" json:"quantidadeBackup"`
	Fornecedor        *string        `json:"fornecedor"`
	DataCompra        time.Time      `gorm:"type:datetime;column:dataCompra" json:"dataCompra"`
	ValorCusto        *float64       `gorm:"type:decimal(10,2);column:valorCusto" json:"valorCusto"`
	ValorAtacado      *float64       `gorm:"type:decimal(10,2);column:valorAtacado" json:"valorAtacado"`
	ValorVarejo       *float64       `gorm:"type:decimal(10,2);column:valorVarejo" json:"valorVarejo"`
	ValorRevendaEspecial *float64    `gorm:"type:decimal(10,2);column:valorRevendaEspecial" json:"valorRevendaEspecial"`
	ValorParcelado10x *float64       `gorm:"type:decimal(10,2);column:valorParcelado10x" json:"valorParcelado10x"`
	CategoriaID       *int           `gorm:"column:categoriaId" json:"categoriaId"`
	Categoria         *CategoriaProduto `gorm:"foreignKey:CategoriaID" json:"categoria,omitempty"`
	CreatedAt         time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt         time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
	Estoque           []Estoque      `gorm:"foreignKey:ProdutoCompradoID" json:"estoque,omitempty"`
	HistoricoDistribuicao []HistoricoDistribuicao `gorm:"foreignKey:ProdutoCompradoID" json:"-"`
}

// TableName especifica o nome da tabela no banco
func (ProdutoComprado) TableName() string {
	return "ProdutoComprado"
}

// Estoque representa o estoque de um produto para um usuário
type Estoque struct {
	ID               int            `gorm:"primaryKey" json:"id"`
	ProdutoCompradoID int           `gorm:"not null;column:produtoCompradoId" json:"produtoCompradoId"`
	ProdutoComprado  ProdutoComprado `gorm:"foreignKey:ProdutoCompradoID" json:"produtoComprado,omitempty"`
	UsuarioID        *int           `gorm:"column:usuarioId" json:"usuarioId"`
	Usuario          *Usuario       `gorm:"foreignKey:UsuarioID" json:"usuario,omitempty"`
	Quantidade       int            `gorm:"default:0" json:"quantidade"`
	Ativo            bool           `gorm:"default:true" json:"ativo"`
	AtendenteNome    *string        `gorm:"column:atendenteNome" json:"atendenteNome"`
	CreatedAt        time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt        time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
	HistoricoVendas  []HistoricoVenda `gorm:"foreignKey:EstoqueID" json:"-"`
}

// TableName especifica o nome da tabela no banco
func (Estoque) TableName() string {
	return "Estoque"
}

// HistoricoVenda representa uma venda no histórico
type HistoricoVenda struct {
	ID              int            `gorm:"primaryKey" json:"id"`
	VendaID         *string        `gorm:"column:vendaId" json:"vendaId"`
	ClienteNome     string         `gorm:"not null;column:clienteNome" json:"clienteNome"`
	Telefone        string         `gorm:"not null" json:"telefone"`
	Endereco        string         `gorm:"not null" json:"endereco"`
	ProdutoNome     string         `gorm:"not null;column:produtoNome" json:"produtoNome"`
	Quantidade      int            `gorm:"not null" json:"quantidade"`
	PrecoUnitario   float64        `gorm:"type:decimal(10,2);not null;column:precoUnitario" json:"precoUnitario"`
	ValorTotal      float64        `gorm:"type:decimal(10,2);not null;column:valorTotal" json:"valorTotal"`
	Observacoes     *string        `json:"observacoes"`
	VendedorNome     string         `gorm:"not null;column:vendedorNome" json:"vendedorNome"`
	VendedorEmail    string         `gorm:"not null;column:vendedorEmail" json:"vendedorEmail"`
	FormaPagamento  string         `gorm:"not null;column:formaPagamento" json:"formaPagamento"`
	ValorPix         *float64      `gorm:"type:decimal(10,2);column:valorPix" json:"valorPix"`
	ValorCartao      *float64      `gorm:"type:decimal(10,2);column:valorCartao" json:"valorCartao"`
	ValorDinheiro    *float64      `gorm:"type:decimal(10,2);column:valorDinheiro" json:"valorDinheiro"`
	FotoProduto      *string        `gorm:"column:fotoProduto" json:"fotoProduto"`
	TipoCliente      *string        `gorm:"column:tipoCliente" json:"tipoCliente"`
	EstoqueID        int            `gorm:"not null;column:estoqueId" json:"estoqueId"`
	Estoque          Estoque        `gorm:"foreignKey:EstoqueID" json:"-"`
	UsuarioID        int            `gorm:"not null;column:usuarioId" json:"usuarioId"`
	Usuario          Usuario        `gorm:"foreignKey:UsuarioID" json:"-"`
	Transferida      bool           `gorm:"default:false;column:transferida" json:"transferida"`
	VendedorOriginal *string        `gorm:"column:vendedorOriginal" json:"vendedorOriginal"`
	CreatedAt        time.Time      `gorm:"column:createdAt" json:"createdAt"`
}

// TableName especifica o nome da tabela no banco
func (HistoricoVenda) TableName() string {
	return "HistoricoVenda"
}

// CategoriaDespesa representa uma categoria de despesas
type CategoriaDespesa struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Nome      string    `gorm:"type:varchar(255);not null" json:"nome"`
	Descricao *string   `gorm:"type:text" json:"descricao"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	Despesas  []Despesa `gorm:"foreignKey:CategoriaID" json:"-"`
}

// TableName especifica o nome da tabela no banco
func (CategoriaDespesa) TableName() string {
	return "CategoriaDespesa"
}

// Despesa representa uma despesa
type Despesa struct {
	ID          int             `gorm:"primaryKey" json:"id"`
	Nome        string          `gorm:"type:varchar(255);not null" json:"nome"`
	Valor       float64         `gorm:"type:decimal(10,2);not null" json:"valor"`
	CategoriaID int             `gorm:"not null;column:categoriaId" json:"categoriaId"`
	Categoria   CategoriaDespesa `gorm:"foreignKey:CategoriaID" json:"categoria,omitempty"`
	Descricao   *string         `gorm:"type:text" json:"descricao"`
	Data        time.Time       `gorm:"type:date;not null" json:"data"`
	CreatedAt   time.Time       `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time       `gorm:"column:updatedAt" json:"updatedAt"`
}

// TableName especifica o nome da tabela no banco
func (Despesa) TableName() string {
	return "Despesa"
}

// CategoriaProduto representa uma categoria de produtos
type CategoriaProduto struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Nome      string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"nome"`
	Descricao *string   `gorm:"type:text" json:"descricao"`
	Icone     *string   `gorm:"type:varchar(100)" json:"icone"`
	Cor       *string   `gorm:"type:varchar(20)" json:"cor"`
	Ativo     bool      `gorm:"default:true" json:"ativo"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	Produtos  []ProdutoComprado `gorm:"foreignKey:CategoriaID" json:"-"`
}

// TableName especifica o nome da tabela no banco
func (CategoriaProduto) TableName() string {
	return "CategoriaProduto"
}

// HistoricoDistribuicao representa o histórico de distribuição de produtos
type HistoricoDistribuicao struct {
	ID                int             `gorm:"primaryKey" json:"id"`
	ProdutoCompradoID int             `gorm:"not null;column:produtoCompradoId" json:"produtoCompradoId"`
	ProdutoComprado   ProdutoComprado `gorm:"foreignKey:ProdutoCompradoID" json:"produtoComprado,omitempty"`
	UsuarioID         int             `gorm:"not null;column:usuarioId" json:"usuarioId"`
	Usuario           Usuario         `gorm:"foreignKey:UsuarioID" json:"usuario,omitempty"`
	Quantidade        int             `gorm:"not null" json:"quantidade"`
	Data              time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"data"`
}

// TableName especifica o nome da tabela no banco
func (HistoricoDistribuicao) TableName() string {
	return "HistoricoDistribuicao"
}

