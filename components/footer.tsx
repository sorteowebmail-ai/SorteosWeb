"use client";

import Link from "next/link";
import { Gift } from "lucide-react";

const footerLinks = {
  producto: [
    { label: "Funcionalidades", href: "/#features" },
    { label: "Precios", href: "/#pricing" },
    { label: "Proceso", href: "/#how-it-works" },
    { label: "Iniciar sorteo", href: "/sorteo/nuevo" },
  ],
  legal: [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos de Uso", href: "/terminos" },
    { label: "Cookies", href: "/cookies" },
    { label: "Contacto", href: "/contacto" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Gift className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold text-foreground tracking-tight">
                SorteosWeb
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Plataforma profesional para sorteos de Instagram.
              Selección aleatoria verificable. Sin credenciales.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Producto</h3>
            <ul className="space-y-3">
              {footerLinks.producto.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SorteosWeb. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            No almacenamos credenciales de Instagram.
          </p>
        </div>
      </div>
    </footer>
  );
}
