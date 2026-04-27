/**
 * Footer chiquito con crédito "Craneado por Otra Forma".
 * Se renderiza al pie del cliente, staff y login.
 * El logo viene del sitio público de otra-forma.com (SVG escalable).
 */
export function FooterCredit() {
  const otraFormaUrl = "https://otra-forma.com"
  const logoUrl = "https://otra-forma.com/wp-content/uploads/2025/11/Group-33928.svg"

  return (
    <footer className="w-full py-4 flex items-center justify-center gap-2 text-xs text-gray-400 border-t border-gray-100 bg-transparent">
      <span>Craneado por</span>
      <a href={otraFormaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-80 transition-opacity">
        <img src={logoUrl} alt="Otra Forma" className="h-4 w-auto" />
      </a>
    </footer>
  )
}
