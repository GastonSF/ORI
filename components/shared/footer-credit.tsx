/**
 * Footer chiquito con crédito "Craneado por Otra Forma".
 * Se renderiza al pie del cliente, staff y login.
 * El logo viene del sitio público de otra-forma.com (SVG escalable).
 * Aplicamos un filtro CSS para teñirlo gris oscuro y que tenga
 * contraste sobre fondo blanco/gris claro.
 */
export function FooterCredit() {
  const otraFormaUrl = "https://otra-forma.com"
  const logoUrl = "https://otra-forma.com/wp-content/uploads/2025/11/Group-33928.svg"

  return (
    <footer className="w-full py-5 flex items-center justify-center gap-2.5 text-xs text-gray-500 border-t border-gray-100 bg-transparent">
      <span>Craneado por</span>
      <a href={otraFormaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-70 transition-opacity">
        <img src={logoUrl} alt="Otra Forma" className="h-5 w-auto" style={{ filter: "brightness(0) saturate(100%) invert(35%)" }} />
      </a>
    </footer>
  )
}
