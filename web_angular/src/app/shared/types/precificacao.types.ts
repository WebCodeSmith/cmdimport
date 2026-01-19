export interface ItemPrecificacao {
    id: number | null;
    nomeProduto: string;
    totalQuantidade: number;
    valorDinheiroPix: number;
    valorDebito: number;
    valorCartaoVista: number;
    valorCredito5x: number;
    valorCredito10x: number;
    valorCredito12x: number;
    updatedAt: string | null;
}
