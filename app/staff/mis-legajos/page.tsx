import { redirect } from "next/navigation"

/**
 * "Mis legajos" es la bandeja del staff pre-filtrada por asignación = mine.
 *
 * Por ahora redirige a /staff?asignacion=mine para reutilizar toda la
 * lógica de la bandeja. Más adelante, cuando refinemos la experiencia,
 * esta ruta puede convertirse en una página con su propio diseño
 * (header personalizado, métricas del oficial, etc.).
 */
export default function MisLegajosPage() {
  redirect("/staff?asignacion=mine")
}
