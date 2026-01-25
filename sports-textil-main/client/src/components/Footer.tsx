import { Link } from "wouter";
import { Calendar, MapPin, Mail, Phone, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ST Eventos</h3>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              A plataforma de inscrições para os melhores eventos esportivos do Brasil. 
              Encontre sua próxima corrida e supere seus limites.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors">
                  Eventos
                </Link>
              </li>
              <li>
                <Link href="/minhas-inscricoes" className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors">
                  Minhas Inscrições
                </Link>
              </li>
              <li>
                <Link href="/minha-conta" className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors">
                  Minha Conta
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Para Organizadores</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/admin" className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors">
                  Área do Organizador
                </Link>
              </li>
              <li>
                <span className="text-primary-foreground/80 text-sm">
                  Cadastre seu evento
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Mail className="h-4 w-4" />
                <span>contato@steventos.com.br</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Phone className="h-4 w-4" />
                <span>(83) 99999-9999</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <MapPin className="h-4 w-4" />
                <span>João Pessoa, PB</span>
              </li>
            </ul>
            <div className="flex gap-4 mt-4">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm text-primary-foreground/60">
            {currentYear} ST Eventos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
