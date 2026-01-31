import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";
import { 
  Download,
  ArrowLeft,
  ShoppingCart,
  Check,
  X,
  Clock,
  AlertCircle
} from "lucide-react";
import { formatDateOnlyBrazil, formatDateTimeBrazil } from "@/lib/timezone";
import type { Event } from "@shared/schema";

interface EnrichedOrder {
  id: string;
  numeroPedido: number;
  nomeEvento: string;
  nomeComprador: string;
  emailComprador: string;
  cpfComprador: string | null;
  status: string;
  dataPedido: string;
  dataPagamento: string | null;
  subtotal: number;
  valorDesconto: number;
  codigoCupom: string | null;
  codigoVoucher: string | null;
  taxaComodidade: number;
  valorTotal: number;
  valorLiquido: number;
  metodoPagamento: string | null;
  idPagamentoGateway: string | null;
  qtdInscricoes: number;
}

interface OrderTotals {
  totalBruto: number;
  totalDescontos: number;
  totalTaxaComodidade: number;
  totalLiquido: number;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

const metodoPagamentoLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "CC",
  boleto: "Boleto",
  cortesia: "Cortesia",
};

function formatCPF(cpf: string | null): string {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Check; className?: string }> = {
    pago: { variant: "default", icon: Check },
    pendente: { variant: "secondary", icon: Clock, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    cancelado: { variant: "destructive", icon: X },
    expirado: { variant: "destructive", icon: AlertCircle },
  };
  
  const { variant, icon: Icon, className } = config[status] || config.pendente;
  
  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {statusLabels[status] || status}
    </Badge>
  );
}

export default function AdminEventPedidosPage() {
  const { id } = useParams<{ id: string }>();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFilter, setExportFilter] = useState("todos");

  const { data: eventData, isLoading: eventLoading } = useQuery<{ success: boolean; data: Event }>({
    queryKey: ["/api/admin/events", id],
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ 
    success: boolean; 
    data: { orders: EnrichedOrder[]; totais: OrderTotals } 
  }>({
    queryKey: ["/api/admin/events", id, "orders"],
  });

  const event = eventData?.data;
  const orders = ordersData?.data?.orders || [];
  const totais = ordersData?.data?.totais;

  const getExportData = (filter: string) => {
    let dataToExport = orders;
    
    if (filter === "pagos") {
      dataToExport = orders.filter(o => o.status === "pago");
    } else if (filter === "pendentes") {
      dataToExport = orders.filter(o => o.status === "pendente");
    } else if (filter === "cancelados") {
      dataToExport = orders.filter(o => o.status === "cancelado" || o.status === "expirado");
    }

    const headers = [
      "Nº Pedido",
      "Nome do Evento",
      "Nome do Comprador",
      "Email do Comprador",
      "CPF",
      "Status",
      "Data do Pedido",
      "Data do Pagamento",
      "Hora do Pagamento",
      "Subtotal",
      "Valor de Desconto",
      "Código Cupom/Voucher",
      "Taxa de Comodidade",
      "Valor Total",
      "Valor Líquido",
      "Forma de Pagamento",
      "ID Transação Gateway",
      "Qtd. Inscrições",
    ];

    const rows = dataToExport.map((order) => {
      const dataPagamento = order.dataPagamento ? new Date(order.dataPagamento) : null;
      
      return [
        order.numeroPedido,
        order.nomeEvento,
        order.nomeComprador,
        order.emailComprador,
        formatCPF(order.cpfComprador),
        statusLabels[order.status] || order.status,
        formatDateOnlyBrazil(order.dataPedido),
        dataPagamento ? formatDateOnlyBrazil(order.dataPagamento!) : "-",
        dataPagamento ? dataPagamento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-",
        formatCurrency(order.subtotal),
        formatCurrency(order.valorDesconto),
        order.codigoCupom || order.codigoVoucher || "-",
        formatCurrency(order.taxaComodidade),
        formatCurrency(order.valorTotal),
        formatCurrency(order.valorLiquido),
        metodoPagamentoLabels[order.metodoPagamento || ""] || order.metodoPagamento || "-",
        order.idPagamentoGateway || "-",
        order.qtdInscricoes,
      ];
    });

    // Calcular totais do filtro
    const paidOrders = dataToExport.filter(o => o.status === "pago");
    const totalBruto = paidOrders.reduce((sum, o) => sum + o.valorTotal, 0);
    const totalDescontos = paidOrders.reduce((sum, o) => sum + o.valorDesconto, 0);
    const totalTaxa = paidOrders.reduce((sum, o) => sum + o.taxaComodidade, 0);
    const totalLiquido = paidOrders.reduce((sum, o) => sum + o.valorLiquido, 0);

    // Linha de totais
    const totalsRow = [
      "TOTAIS",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      formatCurrency(totalDescontos),
      "",
      formatCurrency(totalTaxa),
      formatCurrency(totalBruto),
      formatCurrency(totalLiquido),
      "",
      "",
      "",
    ];

    return { headers, rows: [...rows, totalsRow] };
  };

  const exportToExcel = () => {
    const { headers, rows } = getExportData(exportFilter);
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    const colWidths = headers.map((_, i) => {
      const maxLen = Math.max(
        headers[i].length,
        ...rows.map(row => String(row[i]).length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    
    const filterSuffix = exportFilter !== "todos" ? `_${exportFilter}` : "";
    XLSX.writeFile(wb, `pedidos_${event?.slug || id}${filterSuffix}_${new Date().toISOString().split("T")[0]}.xlsx`);
    
    setExportModalOpen(false);
  };

  const isLoading = eventLoading || ordersLoading;

  if (isLoading) {
    return (
      <AdminLayout title="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout title="Evento não encontrado">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">Evento não encontrado</h3>
              <Link href="/admin/events">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const paidOrders = orders.filter(o => o.status === "pago");
  const pendingOrders = orders.filter(o => o.status === "pendente");
  const cancelledOrders = orders.filter(o => o.status === "cancelado" || o.status === "expirado");

  return (
    <AdminLayout title={`Relatório de Pedidos - ${event.nome}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/events/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Relatório de Pedidos</h1>
              <p className="text-muted-foreground">{event.nome}</p>
            </div>
          </div>
          <Button onClick={() => setExportModalOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{orders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{paidOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cancelados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{cancelledOrders.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Totais financeiros */}
        {totais && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro (Pedidos Pagos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bruto</p>
                  <p className="text-xl font-bold">{formatCurrency(totais.totalBruto)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Descontos</p>
                  <p className="text-xl font-bold text-orange-600">-{formatCurrency(totais.totalDescontos)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Comodidade</p>
                  <p className="text-xl font-bold">{formatCurrency(totais.totalTaxaComodidade)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Líquido</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totais.totalLiquido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>{orders.length} pedidos encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-center">Inscrições</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-bold">#{order.numeroPedido}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.nomeComprador}</p>
                          <p className="text-sm text-muted-foreground">{order.emailComprador}</p>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell>{formatDateOnlyBrazil(order.dataPedido)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.valorTotal)}</TableCell>
                      <TableCell className="text-right text-orange-600">
                        {order.valorDesconto > 0 ? `-${formatCurrency(order.valorDesconto)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {order.taxaComodidade > 0 ? formatCurrency(order.taxaComodidade) : "-"}
                      </TableCell>
                      <TableCell>{metodoPagamentoLabels[order.metodoPagamento || ""] || "-"}</TableCell>
                      <TableCell className="text-center">{order.qtdInscricoes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de exportação */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Relatório de Pedidos</DialogTitle>
            <DialogDescription>
              Selecione quais pedidos deseja exportar
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={exportFilter} onValueChange={setExportFilter} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="todos" id="todos" />
              <Label htmlFor="todos">Todos os pedidos ({orders.length})</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pagos" id="pagos" />
              <Label htmlFor="pagos">Apenas pagos ({paidOrders.length})</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pendentes" id="pendentes" />
              <Label htmlFor="pendentes">Apenas pendentes ({pendingOrders.length})</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cancelados" id="cancelados" />
              <Label htmlFor="cancelados">Apenas cancelados/expirados ({cancelledOrders.length})</Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancelar</Button>
            <Button onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
