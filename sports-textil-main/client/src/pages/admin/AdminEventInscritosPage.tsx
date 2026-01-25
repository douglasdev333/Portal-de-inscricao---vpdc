import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Search, 
  Download,
  ArrowLeft,
  Settings,
  Check,
  X,
  Clock,
  User,
  CreditCard,
  Calendar,
  Shirt,
  Hash,
  Phone,
  Mail,
  Layers,
  History,
  ShoppingCart
} from "lucide-react";
import { formatDateOnlyBrazil, formatDateTimeBrazil } from "@/lib/timezone";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, Modality } from "@shared/schema";

interface EnrichedRegistration {
  id: string;
  numeroInscricao: number;
  athleteId: string;
  modalityId: string;
  modalityName: string;
  athleteName: string;
  athleteEmail: string;
  athletePhone: string;
  nomeCompleto: string | null;
  cpf: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  tamanhoCamisa: string | null;
  valorUnitario: string;
  taxaComodidade: string;
  status: string;
  equipe: string | null;
  dataInscricao: string;
  batchName: string;
  orderStatus: string;
  metodoPagamento: string | null;
  dataPagamento: string | null;
  valorTotal: string;
  valorDesconto: string;
  orderId: string;
  numeroPedido: number | null;
  orderRegistrationsCount: number;
}

interface StatusChangeLog {
  id: string;
  entity_type: string;
  entity_id: string;
  old_status: string | null;
  new_status: string;
  reason: string;
  changed_by_type: string;
  changed_by_id: string | null;
  metadata: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const orderStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

const metodoPagamentoLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartao de Credito",
  boleto: "Boleto",
  cortesia: "Cortesia",
};

function formatCPF(cpf: string | null): string {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "confirmada":
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900" title="Confirmada">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      );
    case "cancelada":
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900" title="Cancelada">
          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
      );
    case "pendente":
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900" title="Pendente">
          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    default:
      return <span>{status}</span>;
  }
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "R$ 0,00";
  }
  let num: number;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    num = parseFloat(normalized);
  } else {
    num = value;
  }
  if (isNaN(num)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export default function AdminEventInscritosPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [modalityFilter, setModalityFilter] = useState<string>("todos");
  const [selectedRegistration, setSelectedRegistration] = useState<EnrichedRegistration | null>(null);
  
  // Status change states
  const [newRegistrationStatus, setNewRegistrationStatus] = useState<string>("");
  const [newOrderStatus, setNewOrderStatus] = useState<string>("");
  const [statusChangeReason, setStatusChangeReason] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [statusChangeType, setStatusChangeType] = useState<"registration" | "order" | null>(null);

  const { data: eventData, isLoading: eventLoading } = useQuery<{ success: boolean; data: Event }>({
    queryKey: ["/api/admin/events", id],
  });

  const { data: modalitiesData } = useQuery<{ success: boolean; data: Modality[] }>({
    queryKey: ["/api/admin/events", id, "modalities"],
  });

  const { data: registrationsData, isLoading: registrationsLoading } = useQuery<{ success: boolean; data: EnrichedRegistration[] }>({
    queryKey: ["/api/admin/events", id, "registrations"],
  });
  
  // Fetch status history when a registration is selected
  const { data: registrationHistoryData, isLoading: registrationHistoryLoading } = useQuery<{ success: boolean; data: StatusChangeLog[] }>({
    queryKey: ["/api/admin/events/status-history/registration", selectedRegistration?.id],
    enabled: !!selectedRegistration?.id,
  });
  
  const { data: orderHistoryData, isLoading: orderHistoryLoading } = useQuery<{ success: boolean; data: StatusChangeLog[] }>({
    queryKey: ["/api/admin/events/status-history/order", selectedRegistration?.orderId],
    enabled: !!selectedRegistration?.orderId,
  });
  
  const registrationHistory = registrationHistoryData?.data || [];
  const orderHistory = orderHistoryData?.data || [];
  
  const resetStatusChangeState = () => {
    setNewRegistrationStatus("");
    setNewOrderStatus("");
    setStatusChangeReason("");
    setStatusChangeType(null);
  };
  
  // Mutations for status changes
  const updateRegistrationStatusMutation = useMutation({
    mutationFn: async ({ registrationId, status, reason }: { registrationId: string; status: string; reason: string }) => {
      return await apiRequest("PATCH", `/api/admin/events/${id}/registrations/${registrationId}/status`, { status, reason });
    },
    onSuccess: (_, variables) => {
      toast({ title: "Status da inscricao atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events", id, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/status-history/registration", selectedRegistration?.id] });
      setConfirmDialogOpen(false);
      if (selectedRegistration) {
        setSelectedRegistration({ ...selectedRegistration, status: variables.status });
      }
      resetStatusChangeState();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    }
  });
  
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: string; status: string; reason: string }) => {
      return await apiRequest("PATCH", `/api/admin/events/${id}/orders/${orderId}/status`, { status, reason });
    },
    onSuccess: (_, variables) => {
      toast({ title: "Status do pedido atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events", id, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events/status-history/order", selectedRegistration?.orderId] });
      setConfirmDialogOpen(false);
      if (selectedRegistration) {
        setSelectedRegistration({ ...selectedRegistration, orderStatus: variables.status });
      }
      resetStatusChangeState();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    }
  });
  
  const handleStatusChangeClick = (type: "registration" | "order", newStatus: string) => {
    if (type === "registration") {
      setNewRegistrationStatus(newStatus);
    } else {
      setNewOrderStatus(newStatus);
    }
    setStatusChangeType(type);
    setConfirmDialogOpen(true);
  };
  
  const handleConfirmStatusChange = () => {
    if (!selectedRegistration || !statusChangeReason.trim()) {
      toast({ title: "Por favor, informe o motivo da alteracao", variant: "destructive" });
      return;
    }
    
    if (statusChangeType === "registration") {
      updateRegistrationStatusMutation.mutate({
        registrationId: selectedRegistration.id,
        status: newRegistrationStatus,
        reason: statusChangeReason
      });
    } else if (statusChangeType === "order") {
      updateOrderStatusMutation.mutate({
        orderId: selectedRegistration.orderId,
        status: newOrderStatus,
        reason: statusChangeReason
      });
    }
  };

  const event = eventData?.data;
  const modalities = modalitiesData?.data || [];
  const registrations = registrationsData?.data || [];

  const isLoading = eventLoading || registrationsLoading;

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = 
      reg.athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.cpf?.includes(searchTerm) ||
      reg.numeroInscricao.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "todos" || reg.status === statusFilter;
    const matchesModality = modalityFilter === "todos" || reg.modalityId === modalityFilter;
    return matchesSearch && matchesStatus && matchesModality;
  });

  const exportToExcel = () => {
    const headers = [
      "Numero",
      "Nome",
      "CPF",
      "Email",
      "Telefone",
      "Sexo",
      "Data Nascimento",
      "Modalidade",
      "Tamanho Camisa",
      "Equipe",
      "Valor",
      "Taxa",
      "Status",
      "Data Inscricao",
    ];

    const rows = filteredRegistrations.map((reg) => [
      reg.numeroInscricao,
      reg.nomeCompleto || reg.athleteName,
      reg.cpf || "",
      reg.athleteEmail,
      reg.athletePhone,
      reg.sexo || "",
      reg.dataNascimento ? formatDateOnlyBrazil(reg.dataNascimento) : "",
      reg.modalityName,
      reg.tamanhoCamisa || "",
      reg.equipe || "",
      reg.valorUnitario,
      reg.taxaComodidade,
      statusLabels[reg.status] || reg.status,
      formatDateOnlyBrazil(reg.dataInscricao),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(";")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscritos_${event?.slug || id}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Carregando..."
        breadcrumbs={[
          { label: "Eventos", href: "/admin/eventos" },
          { label: "Inscritos" },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout
        title="Evento nao encontrado"
        breadcrumbs={[
          { label: "Eventos", href: "/admin/eventos" },
          { label: "Nao encontrado" },
        ]}
      >
        <div className="text-center py-12">
          <p className="text-muted-foreground">O evento solicitado nao foi encontrado.</p>
          <Link href="/admin/eventos">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Eventos
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Inscritos: ${event.nome}`}
      breadcrumbs={[
        { label: "Eventos", href: "/admin/eventos" },
        { label: event.nome, href: `/admin/eventos/${id}` },
        { label: "Inscritos" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inscritos</h1>
            <p className="text-muted-foreground">
              {filteredRegistrations.length} inscricoes encontradas
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={filteredRegistrations.length === 0}
              data-testid="button-export-excel"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Link href={`/admin/eventos/${id}/gerenciar`}>
              <Button variant="outline" data-testid="button-manage-event">
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar Evento
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou numero..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-inscritos"
                />
              </div>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-modality-filter">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas modalidades</SelectItem>
                  {modalities.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRegistrations.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {registrations.length === 0 
                  ? "Nenhuma inscricao cadastrada" 
                  : "Nenhuma inscricao encontrada com os filtros aplicados"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Camisa</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((reg) => (
                      <TableRow key={reg.id} data-testid={`row-inscrito-${reg.id}`}>
                        <TableCell className="font-medium">
                          #{reg.numeroInscricao}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedRegistration(reg)}
                            className="text-left hover:underline focus:outline-none focus:underline"
                            data-testid={`button-view-inscrito-${reg.id}`}
                          >
                            <p className="font-medium text-primary">{reg.nomeCompleto || reg.athleteName}</p>
                            <p className="text-xs text-muted-foreground">{reg.athleteEmail}</p>
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCPF(reg.cpf)}
                        </TableCell>
                        <TableCell>
                          {reg.dataNascimento ? formatDateOnlyBrazil(reg.dataNascimento) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{reg.modalityName}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {reg.sexo || "-"}
                        </TableCell>
                        <TableCell>{reg.tamanhoCamisa || "-"}</TableCell>
                        <TableCell className="text-center">
                          <StatusIcon status={reg.status} />
                        </TableCell>
                        <TableCell>
                          {formatDateOnlyBrazil(reg.dataInscricao)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedRegistration(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-registration-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes da Inscricao
            </DialogTitle>
          </DialogHeader>
          
          {selectedRegistration && (
            <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list-registration">
                <TabsTrigger value="detalhes" data-testid="tab-detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="status" data-testid="tab-status">Status</TabsTrigger>
                <TabsTrigger value="historico" data-testid="tab-historico">Historico</TabsTrigger>
              </TabsList>
              
              <TabsContent value="detalhes" className="flex-1 overflow-auto">
                <div className="space-y-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {selectedRegistration.nomeCompleto || selectedRegistration.athleteName}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Inscricao #{selectedRegistration.numeroInscricao}
                      </p>
                    </div>
                    <StatusIcon status={selectedRegistration.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                      <p className="font-mono">{formatCPF(selectedRegistration.cpf)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Data de Nascimento</p>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {selectedRegistration.dataNascimento 
                          ? formatDateOnlyBrazil(selectedRegistration.dataNascimento) 
                          : "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {selectedRegistration.athletePhone || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="flex items-center gap-1 text-sm truncate">
                        <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {selectedRegistration.athleteEmail || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Sexo</p>
                      <p className="capitalize">{selectedRegistration.sexo || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Camisa</p>
                      <p className="flex items-center gap-1">
                        <Shirt className="h-3 w-3 text-muted-foreground" />
                        {selectedRegistration.tamanhoCamisa || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Informacoes da Inscricao
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Modalidade</p>
                        <Badge variant="outline">{selectedRegistration.modalityName}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Lote</p>
                        <p className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          {selectedRegistration.batchName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor da Inscricao</p>
                        <p className="font-semibold">{formatCurrency(selectedRegistration.valorUnitario)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Taxa de Servico</p>
                        <p>{formatCurrency(selectedRegistration.taxaComodidade)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Data da Inscricao</p>
                        <p>{formatDateTimeBrazil(selectedRegistration.dataInscricao)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipe</p>
                        <p>{selectedRegistration.equipe || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Pedido
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Numero do Pedido</p>
                        <p className="font-mono font-semibold">#{selectedRegistration.numeroPedido || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Inscricoes no Pedido</p>
                        <p>{selectedRegistration.orderRegistrationsCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Status do Pedido</p>
                        <Badge 
                          variant={selectedRegistration.orderStatus === "pago" ? "default" : "secondary"}
                        >
                          {orderStatusLabels[selectedRegistration.orderStatus] || selectedRegistration.orderStatus}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Forma de Pagamento</p>
                        <p>
                          {selectedRegistration.metodoPagamento 
                            ? metodoPagamentoLabels[selectedRegistration.metodoPagamento] || selectedRegistration.metodoPagamento
                            : "-"}
                        </p>
                      </div>
                      {selectedRegistration.dataPagamento && (
                        <div className="space-y-1 col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Data do Pagamento</p>
                          <p>{formatDateTimeBrazil(selectedRegistration.dataPagamento)}</p>
                        </div>
                      )}
                      {parseFloat(selectedRegistration.valorDesconto) > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Desconto</p>
                          <p className="text-green-600">{formatCurrency(selectedRegistration.valorDesconto)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="status" className="flex-1 overflow-auto" data-testid="tab-content-status">
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Status da Inscricao
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label>Status atual</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusIcon status={selectedRegistration.status} />
                          <span>{statusLabels[selectedRegistration.status] || selectedRegistration.status}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label>Alterar para</Label>
                        <Select 
                          key={`reg-status-${selectedRegistration.id}-${selectedRegistration.status}`}
                          value={newRegistrationStatus}
                          onValueChange={(value) => handleStatusChangeClick("registration", value)}
                          disabled={confirmDialogOpen || updateRegistrationStatusMutation.isPending}
                        >
                          <SelectTrigger data-testid="select-registration-status">
                            <SelectValue placeholder="Selecionar status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente" disabled={selectedRegistration.status === "pendente"}>Pendente</SelectItem>
                            <SelectItem value="confirmada" disabled={selectedRegistration.status === "confirmada"}>Confirmada</SelectItem>
                            <SelectItem value="cancelada" disabled={selectedRegistration.status === "cancelada"}>Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Status do Pedido #{selectedRegistration.numeroPedido}
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label>Status atual</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={selectedRegistration.orderStatus === "pago" ? "default" : "secondary"}>
                            {orderStatusLabels[selectedRegistration.orderStatus] || selectedRegistration.orderStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label>Alterar para</Label>
                        <Select 
                          key={`order-status-${selectedRegistration.orderId}-${selectedRegistration.orderStatus}`}
                          value={newOrderStatus}
                          onValueChange={(value) => handleStatusChangeClick("order", value)}
                          disabled={confirmDialogOpen || updateOrderStatusMutation.isPending}
                        >
                          <SelectTrigger data-testid="select-order-status">
                            <SelectValue placeholder="Selecionar status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente" disabled={selectedRegistration.orderStatus === "pendente"}>Pendente</SelectItem>
                            <SelectItem value="pago" disabled={selectedRegistration.orderStatus === "pago"}>Pago</SelectItem>
                            <SelectItem value="cancelado" disabled={selectedRegistration.orderStatus === "cancelado"}>Cancelado</SelectItem>
                            <SelectItem value="expirado" disabled={selectedRegistration.orderStatus === "expirado"}>Expirado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este pedido possui {selectedRegistration.orderRegistrationsCount} inscricao(oes). Alterar o status do pedido nao altera automaticamente o status das inscricoes.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="historico" className="flex-1 overflow-auto" data-testid="tab-content-historico">
                <div className="space-y-6 py-4">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historico da Inscricao
                    </h4>
                    {registrationHistoryLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando historico...</p>
                    ) : registrationHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum historico disponivel</p>
                    ) : (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {registrationHistory.map((log) => (
                            <div key={log.id} className="text-sm border-l-2 border-primary pl-3 py-1" data-testid={`history-registration-${log.id}`}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.old_status || "N/A"} → {log.new_status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTimeBrazil(log.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>
                              <p className="text-xs text-muted-foreground">Por: {log.changed_by_type}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                  
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historico do Pedido #{selectedRegistration.numeroPedido}
                    </h4>
                    {orderHistoryLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando historico...</p>
                    ) : orderHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum historico disponivel</p>
                    ) : (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {orderHistory.map((log) => (
                            <div key={log.id} className="text-sm border-l-2 border-primary pl-3 py-1" data-testid={`history-order-${log.id}`}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.old_status || "N/A"} → {log.new_status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTimeBrazil(log.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>
                              <p className="text-xs text-muted-foreground">Por: {log.changed_by_type}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) resetStatusChangeState(); setConfirmDialogOpen(open); }}>
        <AlertDialogContent data-testid="dialog-confirm-status-change">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteracao de status</AlertDialogTitle>
            <AlertDialogDescription>
              {statusChangeType === "registration" 
                ? `Voce esta prestes a alterar o status da inscricao para "${statusLabels[newRegistrationStatus] || newRegistrationStatus}".`
                : `Voce esta prestes a alterar o status do pedido para "${orderStatusLabels[newOrderStatus] || newOrderStatus}".`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Motivo da alteracao *</Label>
            <Textarea
              id="reason"
              placeholder="Informe o motivo da alteracao..."
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              className="mt-2"
              data-testid="input-status-change-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetStatusChangeState} data-testid="button-cancel-status-change">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmStatusChange}
              disabled={!statusChangeReason.trim() || updateRegistrationStatusMutation.isPending || updateOrderStatusMutation.isPending}
              data-testid="button-confirm-status-change"
            >
              {(updateRegistrationStatusMutation.isPending || updateOrderStatusMutation.isPending) ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
