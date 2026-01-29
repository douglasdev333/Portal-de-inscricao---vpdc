import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { OrganizerLayout } from "@/components/organizador/OrganizerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import { 
  Search, 
  Download,
  ArrowLeft,
  Check,
  X,
  Clock,
  Users
} from "lucide-react";
import { formatDateOnlyBrazil } from "@/lib/timezone";
import { useOrganizerAuth } from "@/contexts/OrganizerAuthContext";

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

interface Event {
  id: string;
  nome: string;
  slug: string;
  organizerId: string;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const metodoPagamentoLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
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

export default function OrganizerEventInscritosPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useOrganizerAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [modalityFilter, setModalityFilter] = useState<string>("todos");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFilter, setExportFilter] = useState<string>("todos");

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ success: boolean; data: Event[] }>({
    queryKey: ["/api/admin/events"],
  });

  const event = eventsData?.data?.find((e) => e.id === id);

  const { data: registrationsData, isLoading: registrationsLoading } = useQuery<{ success: boolean; data: EnrichedRegistration[] }>({
    queryKey: [`/api/admin/events/${id}/registrations`],
    enabled: !!id && !!event,
  });

  const registrations = registrationsData?.data || [];

  const modalities = Array.from(new Set(registrations.map((r) => r.modalityName))).sort();

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      searchTerm === "" ||
      (reg.nomeCompleto || reg.athleteName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.cpf || "").includes(searchTerm) ||
      String(reg.numeroInscricao).includes(searchTerm) ||
      (reg.athleteEmail || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "todos" || reg.status === statusFilter;
    const matchesModality = modalityFilter === "todos" || reg.modalityName === modalityFilter;

    return matchesSearch && matchesStatus && matchesModality;
  });

  const getExportData = (filter: string) => {
    let dataToExport = registrations;
    
    if (filter === "confirmadas") {
      dataToExport = registrations.filter(r => r.status === "confirmada");
    } else if (filter === "pendentes") {
      dataToExport = registrations.filter(r => r.status === "pendente");
    } else if (filter === "canceladas") {
      dataToExport = registrations.filter(r => r.status === "cancelada");
    }

    const headers = [
      "Nº Inscrição",
      "Nome",
      "CPF",
      "Email",
      "Telefone",
      "Sexo",
      "Data Nascimento",
      "Modalidade",
      "Tamanho Camisa",
      "Lote",
      "Equipe",
      "Status",
      "Método Pagamento",
      "Valor",
      "Data Inscrição",
    ];

    const rows = dataToExport.map((reg) => [
      reg.numeroInscricao,
      reg.nomeCompleto || reg.athleteName,
      formatCPF(reg.cpf),
      reg.athleteEmail,
      reg.athletePhone || "-",
      reg.sexo === "M" ? "Masculino" : reg.sexo === "F" ? "Feminino" : "-",
      reg.dataNascimento ? formatDateOnlyBrazil(reg.dataNascimento) : "-",
      reg.modalityName,
      reg.tamanhoCamisa || "-",
      reg.batchName,
      reg.equipe || "-",
      statusLabels[reg.status] || reg.status,
      metodoPagamentoLabels[reg.metodoPagamento || ""] || "-",
      formatCurrency(reg.valorUnitario),
      formatDateOnlyBrazil(reg.dataInscricao),
    ]);

    return { headers, rows };
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
    XLSX.utils.book_append_sheet(wb, ws, "Inscritos");
    
    const filterSuffix = exportFilter !== "todos" ? `_${exportFilter}` : "";
    XLSX.writeFile(wb, `inscritos_${event?.slug || id}${filterSuffix}_${new Date().toISOString().split("T")[0]}.xlsx`);
    
    setExportModalOpen(false);
  };

  const isLoading = eventsLoading || registrationsLoading;

  if (isLoading) {
    return (
      <OrganizerLayout title="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </OrganizerLayout>
    );
  }

  if (!event || event.organizerId !== user?.organizerId) {
    return (
      <OrganizerLayout title="Evento não encontrado">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">Evento não encontrado</h3>
              <p className="text-muted-foreground">
                Este evento não existe ou você não tem permissão para visualizá-lo.
              </p>
              <Link href="/organizadores">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Meus Eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout title={`Inscritos - ${event.nome}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/organizadores/evento/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Lista de Inscritos</h1>
            <p className="text-muted-foreground">{event.nome}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div>
                <CardTitle>Inscrições</CardTitle>
                <CardDescription>
                  {filteredRegistrations.length} de {registrations.length} inscritos
                </CardDescription>
              </div>
              <Button onClick={() => setExportModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, email ou nº inscrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="confirmada">Confirmadas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Modalidades</SelectItem>
                  {modalities.map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma inscrição encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Nº</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Camisa</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-mono text-sm">
                          {reg.numeroInscricao}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{reg.nomeCompleto || reg.athleteName}</span>
                            <p className="text-xs text-muted-foreground">{reg.athleteEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCPF(reg.cpf)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{reg.modalityName}</Badge>
                        </TableCell>
                        <TableCell>{reg.tamanhoCamisa || "-"}</TableCell>
                        <TableCell>{reg.batchName}</TableCell>
                        <TableCell className="text-center">
                          <StatusIcon status={reg.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(reg.valorUnitario)}
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

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Inscritos</DialogTitle>
            <DialogDescription>
              Escolha quais inscrições deseja exportar
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={exportFilter} onValueChange={setExportFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="todos" id="todos" />
                <Label htmlFor="todos">Todos os inscritos ({registrations.length})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="confirmadas" id="confirmadas" />
                <Label htmlFor="confirmadas">
                  Apenas confirmadas ({registrations.filter(r => r.status === "confirmada").length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pendentes" id="pendentes" />
                <Label htmlFor="pendentes">
                  Apenas pendentes ({registrations.filter(r => r.status === "pendente").length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="canceladas" id="canceladas" />
                <Label htmlFor="canceladas">
                  Apenas canceladas ({registrations.filter(r => r.status === "cancelada").length})
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
}
