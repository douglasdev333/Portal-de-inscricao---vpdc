import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Award, Info, FileText, Download, Package, AlertCircle, XCircle, CalendarClock, Trophy, CheckCircle, Tag, Users, Timer } from "lucide-react";
import heroImage from '@assets/generated_images/Marathon_runners_landscape_hero_b439e181.png';
import { formatDateOnlyLong } from "@/lib/timezone";
import type { Event, Modality, RegistrationBatch, Price, Attachment } from "@shared/schema";

interface ModalityWithAvailability extends Modality {
  isAvailable?: boolean;
  isSoldOut?: boolean;
}

interface EventWithDetails extends Event {
  modalities: ModalityWithAvailability[];
  activeBatch: RegistrationBatch | null;
  activeBatches: RegistrationBatch[];
  prices: Price[];
  attachments: Attachment[];
  eventSoldOut?: boolean;
  registrationStatus?: 'not_started' | 'open' | 'closed' | 'sold_out' | 'finished';
  registrationMessage?: string | null;
  urlResultados?: string | null;
}

export default function EventoDetailPage() {
  const [, params] = useRoute("/evento/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug;

  const { data, isLoading, error } = useQuery<{ success: boolean; data: EventWithDetails }>({
    queryKey: ["/api/events", slug],
    queryFn: async () => {
      const response = await fetch(`/api/events/${slug}`);
      return response.json();
    },
    enabled: !!slug,
  });

  const event = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <Skeleton className="w-full aspect-[4/3] md:aspect-[21/9] rounded-lg mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Evento não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O evento que você está procurando não existe ou não está mais disponível.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-voltar">
            Ver todos os eventos
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = formatDateOnlyLong(event.dataEvento);

  const handleInscricao = () => {
    setLocation(`/evento/${event.slug}/inscricao/participante`);
  };

  const handleDownload = (url: string, nome: string) => {
    window.open(url, '_blank');
  };

  const getPrice = (modalityId: string): string => {
    const modality = modalities.find(m => m.id === modalityId);
    if (modality?.tipoAcesso === "gratuita") return "Gratuito";
    
    const price = event.prices?.find(p => p.modalityId === modalityId);
    if (!price) return "Consulte";
    
    const valor = parseFloat(price.valor);
    if (valor === 0) return "Gratuito";
    
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const getLowestPrice = (): string => {
    const paidModalities = modalities.filter(m => m.tipoAcesso !== "gratuita");
    if (paidModalities.length === 0) return "Gratuito";
    
    const prices = paidModalities.map(mod => {
      const price = event.prices?.find(p => p.modalityId === mod.id);
      return price ? parseFloat(price.valor) : Infinity;
    }).filter(p => p !== Infinity && p > 0);
    
    if (prices.length === 0) {
      const hasFreeModalities = modalities.some(m => m.tipoAcesso === "gratuita");
      return hasFreeModalities ? "Gratuito" : "Consulte";
    }
    
    const minPrice = Math.min(...prices);
    return `R$ ${minPrice.toFixed(2).replace('.', ',')}`;
  };

  const modalities = event.modalities || [];
  const attachments = event.attachments || [];
  const activeBatches = event.activeBatches || [];
  const eventSoldOut = event.eventSoldOut || event.status === 'esgotado';
  const isFinished = event.status === 'finalizado';
  const registrationStatus = event.registrationStatus || (isFinished ? 'finished' : eventSoldOut ? 'sold_out' : 'open');
  const registrationMessage = event.registrationMessage;
  
  const canRegister = registrationStatus === 'open';

  // Get unique distances
  const uniqueDistances = Array.from(new Set(modalities.map(mod => `${mod.distancia} ${mod.unidadeDistancia}`)));
  
  const getButtonText = () => {
    switch (registrationStatus) {
      case 'not_started':
        return 'Inscrições em Breve';
      case 'closed':
        return 'Inscrições Encerradas';
      case 'sold_out':
        return 'Evento Esgotado';
      case 'finished':
        return 'Ver Resultados';
      default:
        return 'Inscrever-se';
    }
  };
  
  const getStatusBadge = () => {
    switch (registrationStatus) {
      case 'not_started':
        return (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <CalendarClock className="h-4 w-4 mr-1" />
            Em Breve
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <XCircle className="h-4 w-4 mr-1" />
            Encerrado
          </Badge>
        );
      case 'sold_out':
        return (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <XCircle className="h-4 w-4 mr-1" />
            Esgotado
          </Badge>
        );
      case 'finished':
        return (
          <Badge className="text-sm px-3 py-1 bg-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Finalizado
          </Badge>
        );
      default:
        return (
          <Badge className="text-sm px-3 py-1 bg-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Inscrições Abertas
          </Badge>
        );
    }
  };

  const formatBatchDate = (dateStr: string | Date | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Banner with 4:3 aspect ratio */}
        <div className="relative rounded-lg overflow-hidden mb-8">
          <div className="aspect-[4/3] md:aspect-[21/9]">
            <img
              src={event.bannerUrl || heroImage}
              alt={event.nome}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              {event.nome}
            </h1>
            <div className="flex flex-wrap gap-2">
              {uniqueDistances.map((distance) => (
                <Badge key={distance} variant="secondary" className="text-sm bg-white/20 text-white border-white/30">
                  {distance}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 pb-24 md:pb-0">
            {/* Event Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data do Evento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-foreground text-lg">{formattedDate}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Local
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-foreground">{event.endereco}</p>
                  <p className="text-sm text-muted-foreground">{event.cidade}, {event.estado}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs - Sobre, Kit, Documentos */}
            <Tabs defaultValue="sobre" className="space-y-4 md:space-y-6 mb-8">
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-3 gap-1">
                  <TabsTrigger value="sobre" data-testid="tab-sobre" className="flex-shrink-0 text-xs md:text-sm px-3 md:px-4">
                    <Info className="h-3.5 w-3.5 md:hidden mr-1.5" />
                    <span>Sobre</span>
                  </TabsTrigger>
                  <TabsTrigger value="retirada" data-testid="tab-retirada" className="flex-shrink-0 text-xs md:text-sm px-3 md:px-4">
                    <Package className="h-3.5 w-3.5 md:hidden mr-1.5" />
                    <span className="hidden md:inline">Retirada Kit</span>
                    <span className="md:hidden">Retirada de Kit</span>
                  </TabsTrigger>
                  <TabsTrigger value="documentos" data-testid="tab-documentos" className="flex-shrink-0 text-xs md:text-sm px-3 md:px-4">
                    <FileText className="h-3.5 w-3.5 md:hidden mr-1.5" />
                    <span className="hidden md:inline">Documentos</span>
                    <span className="md:hidden">Docs</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="sobre" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Sobre o Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {event.descricao}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="retirada" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Retirada de Kit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {event.informacoesRetiradaKit ? (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {event.informacoesRetiradaKit}
                      </p>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-medium mb-2">
                          Informações em breve
                        </p>
                        <p className="text-sm text-muted-foreground">
                          As informações sobre retirada de kit serão divulgadas em breve.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documentos" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documentos do Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attachments.length > 0 ? (
                      <div className="space-y-3">
                        {attachments.map((doc, idx) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover-elevate transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">{doc.nome}</p>
                                {doc.obrigatorioAceitar && (
                                  <span className="text-xs text-destructive">Aceite obrigatório</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(doc.url, doc.nome)}
                              data-testid={`button-download-${idx}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">
                        Nenhum documento cadastrado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Modalidades Section - Separate from tabs */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Modalidades {eventSoldOut ? '' : 'Disponíveis'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modalities.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {modalities.map((mod) => {
                      const isSoldOut = eventSoldOut || mod.isSoldOut;
                      return (
                        <div 
                          key={mod.id} 
                          className={`p-4 border rounded-lg ${isSoldOut ? 'opacity-60 bg-muted/30' : ''}`}
                          data-testid={`modality-item-${mod.id}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{mod.nome}</h3>
                                {isSoldOut && (
                                  <Badge variant="destructive" className="text-xs">
                                    Esgotado
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Award className="h-4 w-4" />
                                  {mod.distancia} {mod.unidadeDistancia}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="h-4 w-4" />
                                  Largada: {mod.horarioLargada}
                                </span>
                              </div>
                              {mod.descricao && (
                                <p className="text-sm text-muted-foreground mt-2">{mod.descricao}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {!isSoldOut && (
                                <span className="text-xl font-bold text-primary">{getPrice(mod.id)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma modalidade cadastrada
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Batches Card - At the end */}
            {activeBatches.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Lotes de Inscrição
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeBatches.map((batch, index) => {
                      const isCurrentBatch = event.activeBatch?.id === batch.id;
                      const isFuture = batch.status === 'future';
                      const isClosed = batch.status === 'closed';
                      
                      return (
                        <div 
                          key={batch.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isCurrentBatch 
                              ? 'bg-primary/5 border-primary' 
                              : isClosed 
                                ? 'bg-muted/50 opacity-60' 
                                : 'bg-muted/30'
                          }`}
                          data-testid={`batch-item-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              isCurrentBatch ? 'bg-primary' : isClosed ? 'bg-muted-foreground' : 'bg-muted-foreground/50'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{batch.nome}</span>
                                {isCurrentBatch && (
                                  <Badge variant="default" className="text-xs">Ativo</Badge>
                                )}
                                {isFuture && (
                                  <Badge variant="secondary" className="text-xs">Em breve</Badge>
                                )}
                                {isClosed && (
                                  <Badge variant="outline" className="text-xs">Encerrado</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-0.5">
                                <p><span className="font-medium">Início:</span> {formatBatchDate(batch.dataInicio)}</p>
                                {batch.dataTermino && (
                                  <p><span className="font-medium">Término:</span> {formatBatchDate(batch.dataTermino)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Registration Card */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-8">
              <Card className="overflow-hidden">
                {registrationStatus === 'finished' ? (
                  <div className="p-6">
                    <div className="text-center py-4">
                      <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <Trophy className="h-12 w-12 mx-auto text-green-600 dark:text-green-400 mb-3" />
                        <p className="text-lg font-semibold text-green-700 dark:text-green-300 mb-1">
                          Evento Finalizado
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {registrationMessage || 'Confira os resultados oficiais'}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="w-full font-semibold bg-green-600"
                        onClick={() => setLocation(`/evento/${event.slug}/resultados`)}
                        data-testid="button-resultados"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Ver Resultados
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Price Header */}
                    <div className="bg-primary p-6 text-primary-foreground">
                      <p className="text-sm opacity-90 mb-1">A partir de</p>
                      <p className="text-3xl font-bold">{getLowestPrice()}</p>
                      {event.activeBatch && (
                        <p className="text-sm opacity-90 mt-2">
                          Lote: {event.activeBatch.nome}
                        </p>
                      )}
                    </div>
                    
                    <div className="p-6">
                      {registrationMessage && (
                        <div className={`mb-4 p-3 rounded-lg ${
                          registrationStatus === 'not_started' 
                            ? 'bg-secondary/50 border border-secondary' 
                            : 'bg-destructive/10 border border-destructive/20'
                        }`}>
                          <p className={`text-sm font-medium flex items-center gap-2 ${
                            registrationStatus === 'not_started' ? 'text-foreground' : 'text-destructive'
                          }`}>
                            {registrationStatus === 'not_started' ? (
                              <CalendarClock className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            {registrationStatus === 'not_started' ? 'Inscrições em Breve' : 
                             registrationStatus === 'closed' ? 'Inscrições Encerradas' : 'Evento Esgotado'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {registrationMessage}
                          </p>
                        </div>
                      )}
                      
                      {/* Modalities Summary */}
                      <div className="space-y-2 mb-6">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Modalidades</h4>
                        {modalities.map((mod) => {
                          const isSoldOut = eventSoldOut || mod.isSoldOut;
                          return (
                            <div 
                              key={mod.id} 
                              className={`flex items-center justify-between py-2 ${isSoldOut ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{mod.distancia} {mod.unidadeDistancia}</span>
                                <span className="text-xs text-muted-foreground">- {mod.nome}</span>
                              </div>
                              {isSoldOut ? (
                                <Badge variant="destructive" className="text-xs">
                                  Esgotado
                                </Badge>
                              ) : (
                                <span className="font-semibold text-sm">{getPrice(mod.id)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      <Button
                        size="lg"
                        className="w-full font-semibold"
                        onClick={handleInscricao}
                        disabled={!canRegister}
                        data-testid="button-inscricao"
                      >
                        {getButtonText()}
                      </Button>
                      
                      {canRegister && (
                        <p className="text-xs text-muted-foreground text-center mt-3">
                          Inscrição rápida e segura
                        </p>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="px-4 py-3">
          {registrationStatus === 'finished' ? (
            <Button
              size="lg"
              className="w-full font-semibold bg-green-600"
              onClick={() => setLocation(`/evento/${event.slug}/resultados`)}
              data-testid="button-resultados-mobile"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Ver Resultados
            </Button>
          ) : canRegister ? (
            <Button
              size="lg"
              className="w-full font-semibold"
              onClick={handleInscricao}
              data-testid="button-inscricao-mobile"
            >
              Inscrever-se
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {registrationStatus === 'not_started' ? (
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${registrationStatus === 'not_started' ? 'text-foreground' : 'text-destructive'}`}>
                    {registrationStatus === 'not_started' ? 'Inscrições em Breve' : 
                     registrationStatus === 'closed' ? 'Inscrições Encerradas' : 'Evento Esgotado'}
                  </span>
                </div>
                {registrationMessage && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{registrationMessage}</p>
                )}
              </div>
              <Button
                size="lg"
                variant="secondary"
                className="font-semibold"
                disabled
                data-testid="button-inscricao-mobile-disabled"
              >
                {getButtonText()}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
