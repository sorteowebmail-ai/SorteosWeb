"use client";

import Link from "next/link";
import { Gift, Instagram, Twitter, Heart } from "lucide-react";

const footerLinks = {
  producto: [
    { label: "Funciones", href: "/#features" },
    { label: "Precios", href: "/#pricing" },
    { label: "Crear Sorteo", href: "/sorteo/nuevo" },
    { label: "API", href: "/api-docs" },
  ],
  soporte: [
    { label: "Como Funciona", href: "/#how-it-works" },
    { label: "FAQ", href: "/faq" },
    { label: "Contacto", href: "/contacto" },
    { label: "Blog", href: "/blog" },
  ],
  legal: [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Terminos", href: "/terminos" },
    { label: "Cookies", href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-[#9B44D8] to-accent flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                <Gift className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                SorteosWeb
              </span>
            </Link>
            <p className="mt-4 text-muted-foreground max-w-xs">
              La plataforma mas profesional para realizar sorteos en Instagram de
              forma justa, transparente y divertida.
            </p>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Producto</h3>
            <ul className="space-y-3">
              {footerLinks.producto.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Soporte</h3>
            <ul className="space-y-3">
              {footerLinks.soporte.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SorteosWeb. Todos los derechos reservados.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Hecho con <Heart className="w-4 h-4 text-primary fill-primary" /> para la comunidad
          </p>
        </div>
      </div>
    </footer>
  );
}
