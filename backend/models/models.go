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
	CodigoBarras      *string        `json:"codigoBarras"`
	CustoDolar        float64        `gorm:"type:decimal(10,2);not null;column:custoDolar" json:"custoDolar"`
	TaxaDolar         float64        `gorm:"type:decimal(10,4);not null;column:taxaDolar" json:"taxaDolar"`
	Preco             float64        `gorm:"type:decimal(10,2);not null;column:preco" json:"preco"`
	Quantidade        int            `gorm:"default:0" json:"quantidade"`
	QuantidadeBackup  int            `gorm:"default:0" json:"quantidadeBackup"`
	Fornecedor        *string        `json:"fornecedor"`
	DataCompra        time.Time      `gorm:"type:datetime" json:"dataCompra"`
	ValorCusto        *float64       `gorm:"type:decimal(10,2)" json:"valorCusto"`
	ValorAtacado      *float64       `gorm:"type:decimal(10,2)" json:"valorAtacado"`
	ValorVarejo       *float64       `gorm:"type:decimal(10,2)" json:"valorVarejo"`
	ValorParcelado10x *float64       `gorm:"type:decimal(10,2)" json:"valorParcelado10x"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
	Estoque           []Estoque      `gorm:"foreignKey:ProdutoCompradoID" json:"estoque,omitempty"`
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
	EstoqueID        int            `gorm:"not null;column:estoqueId" json:"estoqueId"`
	Estoque          Estoque        `gorm:"foreignKey:EstoqueID" json:"-"`
	UsuarioID        int            `gorm:"not null;column:usuarioId" json:"usuarioId"`
	Usuario          Usuario        `gorm:"foreignKey:UsuarioID" json:"-"`
	CreatedAt        time.Time      `gorm:"column:createdAt" json:"createdAt"`
}

// TableName especifica o nome da tabela no banco
func (HistoricoVenda) TableName() string {
	return "HistoricoVenda"
}

