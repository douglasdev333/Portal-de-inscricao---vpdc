# Correção dos Cálculos Financeiros

## Conceitos Financeiros Corretos

| Campo | Descrição | Fórmula |
|-------|-----------|---------|
| **Valor Bruto** | Valor original das inscrições (sem desconto, sem taxa) | Soma de `valorUnitario` das inscrições confirmadas |
| **Desconto** | Valor descontado via cupons/vouchers | Soma de `valorDesconto` dos pedidos pagos |
| **Valor Líquido** | Valor que vai para o organizador | `Bruto - Desconto` |
| **Taxa de Comodidade** | Taxa cobrada do cliente | Soma de `taxaComodidade` das inscrições confirmadas |
| **Total Pago** | Valor total pago pelo cliente | `Líquido + Taxa` |

## Alterações no Backend

### Arquivo: `server/routes/admin/eventStats.ts`

**Antes (incorreto):**
```typescript
const paidOrders = orders.filter(o => o.status === "pago");
const totalFaturamento = paidOrders.reduce((sum, o) => sum + safeNumber(o.valorTotal), 0);
const totalDescontos = paidOrders.reduce((sum, o) => sum + safeNumber(o.valorDesconto), 0);
const totalTaxaComodidade = confirmedRegistrations.reduce((sum, r) => sum + safeNumber(r.taxaComodidade), 0);

// Resposta da API
faturamento: {
  total: totalFaturamento,  // ERRADO: valorTotal já inclui taxa e desconto
  descontos: totalDescontos,
  taxaComodidade: totalTaxaComodidade,
  liquido: totalFaturamento - totalDescontos  // ERRADO: cálculo invertido
}
```

**Depois (correto):**
```typescript
const paidOrders = orders.filter(o => o.status === "pago");
const totalDescontos = paidOrders.reduce((sum, o) => sum + safeNumber(o.valorDesconto), 0);
const totalTaxaComodidade = confirmedRegistrations.reduce((sum, r) => sum + safeNumber(r.taxaComodidade), 0);
const totalBruto = confirmedRegistrations.reduce((sum, r) => sum + safeNumber(r.valorUnitario), 0);
const totalLiquido = totalBruto - totalDescontos;

// Resposta da API
faturamento: {
  bruto: totalBruto,           // Valor original das inscrições
  descontos: totalDescontos,   // Valor descontado
  taxaComodidade: totalTaxaComodidade,  // Taxa cobrada
  liquido: totalLiquido,       // Bruto - Desconto
  totalPago: totalLiquido + totalTaxaComodidade  // Valor pago pelo cliente
}
```

## Alterações no Frontend

### Interface TypeScript

**Antes:**
```typescript
faturamento: {
  total: number;
  descontos: number;
  taxaComodidade: number;
  liquido: number;
};
```

**Depois:**
```typescript
faturamento: {
  bruto: number;
  descontos: number;
  taxaComodidade: number;
  liquido: number;
  totalPago: number;
};
```

### Exibição na Tela (Resumo Financeiro)

**Ordem correta de exibição:**
1. Valor Bruto
2. Descontos (em vermelho, com sinal negativo)
3. Valor Líquido (em verde, destacado - valor do organizador)
4. Taxa de Comodidade (com sinal positivo)
5. Total Pago (valor final pago pelo cliente)

**Exemplo de código:**
```tsx
<div className="flex justify-between items-center">
  <span>Valor Bruto</span>
  <span>{formatCurrency(stats?.faturamento.bruto || 0)}</span>
</div>
<div className="flex justify-between items-center">
  <span>Descontos</span>
  <span className="text-red-600">-{formatCurrency(stats?.faturamento.descontos || 0)}</span>
</div>
<div className="flex justify-between items-center border-t pt-3">
  <span className="font-semibold">Valor Líquido</span>
  <span className="text-green-600 font-bold">{formatCurrency(stats?.faturamento.liquido || 0)}</span>
</div>
<div className="flex justify-between items-center">
  <span>Taxa de Comodidade</span>
  <span>+{formatCurrency(stats?.faturamento.taxaComodidade || 0)}</span>
</div>
<div className="flex justify-between items-center border-t pt-4">
  <span className="font-semibold">Total Pago</span>
  <span className="font-bold">{formatCurrency(stats?.faturamento.totalPago || 0)}</span>
</div>
```

## Tabelas de Relatórios (Pedidos/Inscritos)

### Colunas Corretas

| Coluna | Descrição |
|--------|-----------|
| Bruto | `valorUnitario` ou `subtotal` |
| Desconto | `valorDesconto` |
| Taxa | `taxaComodidade` |
| Líquido | `Bruto - Desconto` |
| Total Pago | `Líquido + Taxa` |

### Cálculo nas Linhas da Tabela

```tsx
{orders.map((order) => {
  const valorBruto = order.subtotal;
  const valorLiquido = valorBruto - order.valorDesconto;
  const totalPago = valorLiquido + order.taxaComodidade;
  return (
    <TableRow>
      <TableCell>{formatCurrency(valorBruto)}</TableCell>
      <TableCell className="text-orange-600">
        {order.valorDesconto > 0 ? `-${formatCurrency(order.valorDesconto)}` : "-"}
      </TableCell>
      <TableCell>{order.taxaComodidade > 0 ? formatCurrency(order.taxaComodidade) : "-"}</TableCell>
      <TableCell className="text-green-600">{formatCurrency(valorLiquido)}</TableCell>
      <TableCell className="font-medium">{formatCurrency(totalPago)}</TableCell>
    </TableRow>
  );
})}
```

### Linha de Totais (apenas pagos/confirmados)

```tsx
const paidOrders = orders.filter(o => o.status === "pago");
const totals = {
  bruto: paidOrders.reduce((sum, o) => sum + safeNumber(o.subtotal), 0),
  desconto: paidOrders.reduce((sum, o) => sum + safeNumber(o.valorDesconto), 0),
  taxa: paidOrders.reduce((sum, o) => sum + safeNumber(o.taxaComodidade), 0),
};
const liquido = totals.bruto - totals.desconto;
const totalPago = liquido + totals.taxa;
```

## Exportação Excel

### Valores Numéricos (não texto)

```typescript
// Helper para converter valor para número
const safeNumber = (val: any): number => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

// Usar valores numéricos na planilha
worksheet.addRow({
  valorBruto: safeNumber(order.subtotal),  // Número, não string
  desconto: safeNumber(order.valorDesconto),
  taxa: safeNumber(order.taxaComodidade),
  valorLiquido: valorLiquido,
  totalPago: totalPago
});

// Formatar colunas como moeda
worksheet.getColumn('valorBruto').numFmt = 'R$ #,##0.00';
```

## Arquivos Afetados

- `server/routes/admin/eventStats.ts` - Cálculos do backend
- `client/src/pages/admin/AdminEventManagePage.tsx` - Resumo financeiro do admin
- `client/src/pages/admin/AdminEventPedidosPage.tsx` - Tabela de pedidos do admin
- `client/src/pages/admin/AdminEventInscritosPage.tsx` - Tabela de inscritos do admin
- `client/src/pages/organizador/OrganizerEventDashboardPage.tsx` - Dashboard do organizador
- `client/src/pages/organizador/OrganizerEventPedidosPage.tsx` - Tabela de pedidos do organizador
- `client/src/pages/organizador/OrganizerEventInscritosPage.tsx` - Tabela de inscritos do organizador
