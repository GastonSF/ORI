/**
 * Footer chiquito con crédito "Craneado por Otra Forma".
 * Se renderiza al pie del cliente, staff y login.
 * Usa el logo oficial de Otra Forma servido desde /public.
 */
export function FooterCredit() {
  const otraFormaUrl = "https://otra-forma.com"
  const logoUrl = "/Group 33933 (1).png"

  return (
    <footer className="w-full py-5 flex items-center justify-center gap-2.5 text-xs text-gray-500 border-t border-gray-100 bg-transparent">
      <span>Craneado por</span>
      <a href={otraFormaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-70 transition-opacity">
        <img src={logoUrl} alt="Otra Forma" className="h-5 w-auto" />
      </a>
    </footer>
  )
}
