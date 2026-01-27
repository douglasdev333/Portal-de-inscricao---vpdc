import { Link } from "wouter";
import { Calendar, MapPin, Mail, Phone, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-primary">KitRunner</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A plataforma de inscrições para os melhores eventos esportivos do Brasil. 
              Encontre sua próxima corrida e supere seus limites.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Eventos
                </Link>
              </li>
              <li>
                <Link href="/minhas-inscricoes" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Minhas Inscrições
                </Link>
              </li>
              <li>
                <Link href="/minha-conta" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Minha Conta
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Para Organizadores</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/admin" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Área do Organizador
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">
                  Cadastre seu evento
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>contato@kitrunner.com.br</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>(83) 98130-2961</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>João Pessoa, PB</span>
              </li>
            </ul>
            <div className="flex gap-4 mt-4">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {currentYear} KitRunner. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
