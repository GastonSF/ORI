import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Document } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format CUIT with mask XX-XXXXXXXX-X
export function formatCUIT(cuit: string): string {
  const cleaned = cuit.replace(/\D/g, '')
  if (cleaned.length !== 11) return cuit
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`
}

// Parse CUIT input
export function parseCUIT(input: string): string {
  return input.replace(/\D/g, '').slice(0, 11)
}

// Format ARS currency (Argentine format: $12.500.000)
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date to dd/mm/yyyy
export function formatDate(date: Date | undefined): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Format phone number (Argentine format)
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)}-${cleaned.slice(9)}`
  }
  return phone
}

// Calculate completitud percentage
export function calcularCompletitud(documentos: Document[]): number {
  if (documentos.length === 0) return 0
  
  const aprobados = documentos.filter(d => d.estado === 'aprobado').length
  const subidos = documentos.filter(d => d.estado === 'subido' || d.estado === 'enRevision').length
  
  const score = (aprobados + subidos * 0.5) / documentos.length * 100
  return Math.round(score)
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
