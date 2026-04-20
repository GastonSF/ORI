'use client'

import { useState } from 'react'
import { User, FileText, Users, Building2, Handshake, Landmark, LogOut, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ProgressTracker } from '@/components/shared/ProgressTracker'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useApp } from '@/context/AppContext'
import { cn, formatCUIT, formatARS, calcularCompletitud } from '@/lib/utils'
import { CLIENT_TYPES, SECTORS, PROVINCES, MONOTRIBUTO_CATEGORIES, DOCUMENT_REQUIREMENTS, ENTITY_TYPES } from '@/lib/constants'
import type { ClientType, Document, Socio, Director, Autoridad } from '@/lib/types'
import { generateExpediente } from '@/lib/mockData'

const WIZARD_STEPS = [
  { id: 1, label: 'Tipo de cliente' },
  { id: 2, label: 'Datos generales' },
  { id: 3, label: 'Estructura societaria' },
  { id: 4, label: 'Documentación' },
  { id: 5, label: 'Revisión y envío' },
]

const iconMap = {
  User,
  FileText,
  Users,
  Building2,
  Handshake,
  Landmark,
}

export function OnboardingWizard() {
  const { state, setRole, showToast, updateDocStatus } = useApp()
  const client = state.activeClient

  const [currentStep, setCurrentStep] = useState(1)
  const [clientType, setClientType] = useState<ClientType>(client?.tipo || 'SRL')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [expediente, setExpediente] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    razonSocial: client?.razonSocial || '',
    cuit: client?.cuit || '',
    email: client?.email || '',
    telefono: client?.telefono || '',
    domicilio: client?.domicilio || '',
    ciudad: client?.ciudad || '',
    provincia: client?.provincia || '',
    codigoPostal: client?.codigoPostal || '',
    actividad: client?.actividad || '',
    fechaInicioActividad: '',
    facturacionAnual: client?.facturacionAnual?.toString() || '',
    // Monotributo
    categoriaMono: client?.categoriaMono || '',
    // RI
    tieneEmpleados: client?.tieneEmpleados || false,
    cantidadEmpleados: client?.cantidadEmpleados?.toString() || '',
    // Cooperativa
    numeroMatricula: client?.numeroMatricula || '',
    // Entidad Financiera
    autorizacionBCRA: client?.autorizacionBCRA || '',
    tipoEntidad: client?.tipoEntidad || '',
    capitalMinimo: client?.capitalMinimo?.toString() || '',
  })

  // Socios/Directores/Autoridades
  const [socios, setSocios] = useState<Socio[]>(client?.socios || [])
  const [directores, setDirectores] = useState<Director[]>(client?.directores || [])
  const [autoridades, setAutoridades] = useState<Autoridad[]>(client?.autoridades || [])

  // Documents based on client type
  const [documents, setDocuments] = useState<Document[]>(() => {
    if (client?.documentos) return client.documentos
    return DOCUMENT_REQUIREMENTS[clientType].map(doc => ({
      id: doc.id,
      nombre: doc.nombre,
      estado: 'pendiente',
      obligatorio: doc.obligatorio,
    }))
  })

  const completitud = calcularCompletitud(documents)

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleUploadDocument = (docId: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId
          ? { ...doc, estado: 'subido', fechaCarga: new Date() }
          : doc
      )
    )
    if (client) {
      updateDocStatus(client.id, docId, 'subido')
    }
    showToast('Documento cargado correctamente', 'success')
  }

  const handleSubmit = () => {
    const pendingDocs = documents.filter(d => d.obligatorio && d.estado === 'pendiente')
    if (pendingDocs.length > 0) {
      showToast('Completá los campos obligatorios antes de continuar', 'error')
      return
    }
    const exp = generateExpediente()
    setExpediente(exp)
    setShowSuccessModal(true)
    showToast(`Solicitud enviada. Expediente N° ${exp} creado.`, 'success')
  }

  const handleClientTypeChange = (type: ClientType) => {
    setClientType(type)
    // Update documents based on new type
    setDocuments(
      DOCUMENT_REQUIREMENTS[type].map(doc => ({
        id: doc.id,
        nombre: doc.nombre,
        estado: 'pendiente',
        obligatorio: doc.obligatorio,
      }))
    )
  }

  // Step 1: Client Type Selection
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#1A1A2E]">Seleccioná el tipo de cliente</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CLIENT_TYPES.map(({ value, label, icon }) => {
          const Icon = iconMap[icon as keyof typeof iconMap]
          const isSelected = clientType === value
          return (
            <button
              key={value}
              onClick={() => handleClientTypeChange(value)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-2 border-[#1B3FD8] bg-[#E8EDFD]'
                  : 'border-[#E5E7EB] hover:border-[#1B3FD8]'
              )}
            >
              <Icon className={cn('w-6 h-6 mb-2', isSelected ? 'text-[#1B3FD8]' : 'text-[#6B7280]')} />
              <p className={cn('font-medium', isSelected ? 'text-[#1B3FD8]' : 'text-[#374151]')}>{label}</p>
            </button>
          )
        })}
      </div>
      <Card className="bg-[#F4F5F9] border-0">
        <CardContent className="p-4">
          <p className="text-sm text-[#374151]">
            {clientType === 'monotributo' && 'Para monotributistas se requiere DNI, constancia AFIP y comprobante de pago.'}
            {clientType === 'RI' && 'Los responsables inscriptos deben presentar estados contables y declaraciones juradas.'}
            {clientType === 'SRL' && 'Las SRL requieren estatuto social, actas y balances de los últimos 3 años.'}
            {clientType === 'SA' && 'Las sociedades anónimas deben presentar actas de directorio y nómina de accionistas.'}
            {clientType === 'cooperativa' && 'Las cooperativas requieren matrícula INAES y acta de autoridades.'}
            {clientType === 'entidadFinanciera' && 'Las entidades financieras deben presentar autorización BCRA y auditoría externa.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )

  // Step 2: General Data
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#1A1A2E]">Datos generales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">
            Razón social / Nombre completo <span className="text-[#EF4444]">*</span>
          </label>
          <Input
            value={formData.razonSocial}
            onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
            placeholder="Ingresá la razón social"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">
            CUIT <span className="text-[#EF4444]">*</span>
          </label>
          <Input
            value={formData.cuit}
            onChange={e => setFormData({ ...formData, cuit: e.target.value })}
            placeholder="XX-XXXXXXXX-X"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
          <p className="text-xs text-[#6B7280] mt-1">Formato: {formatCUIT('30712345678')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">
            Email de contacto <span className="text-[#EF4444]">*</span>
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="contacto@empresa.com"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Teléfono</label>
          <Input
            value={formData.telefono}
            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="+54 9 11 XXXX-XXXX"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#374151] mb-1">Domicilio fiscal</label>
          <Input
            value={formData.domicilio}
            onChange={e => setFormData({ ...formData, domicilio: e.target.value })}
            placeholder="Calle y número"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Ciudad</label>
          <Input
            value={formData.ciudad}
            onChange={e => setFormData({ ...formData, ciudad: e.target.value })}
            placeholder="Ciudad"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Provincia</label>
          <Select
            value={formData.provincia}
            onValueChange={val => setFormData({ ...formData, provincia: val })}
          >
            <SelectTrigger className="border-[#E5E7EB]">
              <SelectValue placeholder="Seleccionar provincia" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Código postal</label>
          <Input
            value={formData.codigoPostal}
            onChange={e => setFormData({ ...formData, codigoPostal: e.target.value })}
            placeholder="1234"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Actividad principal</label>
          <Select
            value={formData.actividad}
            onValueChange={val => setFormData({ ...formData, actividad: val })}
          >
            <SelectTrigger className="border-[#E5E7EB]">
              <SelectValue placeholder="Seleccionar actividad" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Fecha de inicio de actividad</label>
          <Input
            type="date"
            value={formData.fechaInicioActividad}
            onChange={e => setFormData({ ...formData, fechaInicioActividad: e.target.value })}
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">Facturación anual estimada (ARS)</label>
          <Input
            type="number"
            value={formData.facturacionAnual}
            onChange={e => setFormData({ ...formData, facturacionAnual: e.target.value })}
            placeholder="45000000"
            className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
          />
          {formData.facturacionAnual && (
            <p className="text-xs text-[#6B7280] mt-1">{formatARS(Number(formData.facturacionAnual))}</p>
          )}
        </div>
      </div>
    </div>
  )

  // Step 3: Corporate Structure
  const renderStep3 = () => {
    if (clientType === 'monotributo') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Información adicional - Monotributo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Categoría AFIP</label>
              <Select
                value={formData.categoriaMono}
                onValueChange={val => setFormData({ ...formData, categoriaMono: val })}
              >
                <SelectTrigger className="border-[#E5E7EB]">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {MONOTRIBUTO_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>Categoría {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Alert className="bg-[#EFF6FF] border-[#3B82F6]/30">
            <AlertCircle className="w-4 h-4 text-[#1D4ED8]" />
            <AlertDescription className="text-[#1D4ED8]">
              No se requieren estados financieros para Monotributo
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    if (clientType === 'RI') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Información adicional - Responsable Inscripto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">¿Tiene empleados?</label>
              <Select
                value={formData.tieneEmpleados ? 'si' : 'no'}
                onValueChange={val => setFormData({ ...formData, tieneEmpleados: val === 'si' })}
              >
                <SelectTrigger className="border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.tieneEmpleados && (
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">Cantidad de empleados</label>
                <Input
                  type="number"
                  value={formData.cantidadEmpleados}
                  onChange={e => setFormData({ ...formData, cantidadEmpleados: e.target.value })}
                  placeholder="12"
                  className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
                />
              </div>
            )}
          </div>
        </div>
      )
    }

    if (clientType === 'SRL') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Socios</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 font-medium text-[#374151]">Nombre</th>
                  <th className="text-left py-2 font-medium text-[#374151]">DNI</th>
                  <th className="text-left py-2 font-medium text-[#374151]">% Participación</th>
                  <th className="text-left py-2 font-medium text-[#374151]">Firma autorizada</th>
                </tr>
              </thead>
              <tbody>
                {socios.map(socio => (
                  <tr key={socio.id} className="border-b border-[#E5E7EB]">
                    <td className="py-3 text-[#1A1A2E]">{socio.nombre}</td>
                    <td className="py-3 text-[#374151]">{socio.dni}</td>
                    <td className="py-3 text-[#374151]">{socio.participacion}%</td>
                    <td className="py-3">
                      {socio.firmaAutorizada ? (
                        <Check className="w-4 h-4 text-[#22C55E]" />
                      ) : (
                        <span className="text-[#6B7280]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSocios([
                ...socios,
                { id: `socio-${Date.now()}`, nombre: '', dni: '', participacion: 0, firmaAutorizada: false }
              ])
            }}
            className="border-[#1B3FD8] text-[#1B3FD8] hover:bg-[#E8EDFD]"
          >
            + Agregar socio
          </Button>
        </div>
      )
    }

    if (clientType === 'SA') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Directorio</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 font-medium text-[#374151]">Nombre</th>
                  <th className="text-left py-2 font-medium text-[#374151]">Cargo</th>
                  <th className="text-left py-2 font-medium text-[#374151]">DNI</th>
                  <th className="text-left py-2 font-medium text-[#374151]">% Participación</th>
                </tr>
              </thead>
              <tbody>
                {directores.map(dir => (
                  <tr key={dir.id} className="border-b border-[#E5E7EB]">
                    <td className="py-3 text-[#1A1A2E]">{dir.nombre}</td>
                    <td className="py-3 text-[#374151]">{dir.cargo}</td>
                    <td className="py-3 text-[#374151]">{dir.dni}</td>
                    <td className="py-3 text-[#374151]">{dir.participacion || '-'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setDirectores([
                ...directores,
                { id: `dir-${Date.now()}`, nombre: '', cargo: '', dni: '' }
              ])
            }}
            className="border-[#1B3FD8] text-[#1B3FD8] hover:bg-[#E8EDFD]"
          >
            + Agregar director
          </Button>
        </div>
      )
    }

    if (clientType === 'cooperativa') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Autoridades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Número de matrícula cooperativa</label>
              <Input
                value={formData.numeroMatricula}
                onChange={e => setFormData({ ...formData, numeroMatricula: e.target.value })}
                placeholder="INAES-XXXXX"
                className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 font-medium text-[#374151]">Nombre</th>
                  <th className="text-left py-2 font-medium text-[#374151]">Cargo</th>
                  <th className="text-left py-2 font-medium text-[#374151]">Período</th>
                </tr>
              </thead>
              <tbody>
                {autoridades.map(aut => (
                  <tr key={aut.id} className="border-b border-[#E5E7EB]">
                    <td className="py-3 text-[#1A1A2E]">{aut.nombre}</td>
                    <td className="py-3 text-[#374151]">{aut.cargo}</td>
                    <td className="py-3 text-[#374151]">{aut.periodo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setAutoridades([
                ...autoridades,
                { id: `aut-${Date.now()}`, nombre: '', cargo: '', periodo: '' }
              ])
            }}
            className="border-[#1B3FD8] text-[#1B3FD8] hover:bg-[#E8EDFD]"
          >
            + Agregar autoridad
          </Button>
        </div>
      )
    }

    if (clientType === 'entidadFinanciera') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Información de entidad financiera</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Número de autorización BCRA</label>
              <Input
                value={formData.autorizacionBCRA}
                onChange={e => setFormData({ ...formData, autorizacionBCRA: e.target.value })}
                placeholder="BCRA-XXXX-XXXX"
                className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Tipo de entidad</label>
              <Select
                value={formData.tipoEntidad}
                onValueChange={val => setFormData({ ...formData, tipoEntidad: val })}
              >
                <SelectTrigger className="border-[#E5E7EB]">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Capital mínimo regulatorio (ARS)</label>
              <Input
                type="number"
                value={formData.capitalMinimo}
                onChange={e => setFormData({ ...formData, capitalMinimo: e.target.value })}
                placeholder="500000000"
                className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
              />
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // Step 4: Documentation
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1A1A2E]">Documentación requerida</h2>
        <span className="text-sm text-[#6B7280]">
          {documents.filter(d => d.estado !== 'pendiente').length} de {documents.length} cargados
        </span>
      </div>
      <div className="space-y-3">
        {documents.map(doc => (
          <div key={doc.id} className="bg-white border border-[#E5E7EB] rounded-lg p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#1A1A2E]">{doc.nombre}</span>
                {doc.obligatorio && <span className="text-[#EF4444] text-xs">*</span>}
              </div>
              <div className="mt-1">
                <StatusBadge status={doc.estado} />
              </div>
              {doc.estado === 'rechazado' && doc.motivoRechazo && (
                <p className="mt-2 text-xs text-[#B91C1C] bg-[#FEE2E2] rounded px-2 py-1 inline-block">
                  Motivo: {doc.motivoRechazo}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 ml-4">
              {(doc.estado === 'pendiente' || doc.estado === 'rechazado') && (
                <Button
                  onClick={() => handleUploadDocument(doc.id)}
                  size="sm"
                  className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
                >
                  {doc.estado === 'rechazado' ? 'Volver a subir' : 'Subir'}
                </Button>
              )}
              {(doc.estado === 'subido' || doc.estado === 'enRevision' || doc.estado === 'aprobado') && (
                <span className="text-sm text-[#15803D]">
                  <Check className="w-4 h-4 inline mr-1" />
                  Cargado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Step 5: Review and Submit
  const renderStep5 = () => {
    const pendingDocs = documents.filter(d => d.obligatorio && d.estado === 'pendiente')
    const uploadedDocs = documents.filter(d => d.estado !== 'pendiente')

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[#1A1A2E]">Revisión y envío</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Data Summary */}
          <Card className="border border-[#E5E7EB]">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#1A1A2E] mb-4">Datos del cliente</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Razón social</dt>
                  <dd className="text-[#1A1A2E] font-medium">{formData.razonSocial}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">CUIT</dt>
                  <dd className="text-[#1A1A2E] font-medium">{formData.cuit}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Tipo</dt>
                  <dd className="text-[#1A1A2E] font-medium">{CLIENT_TYPES.find(t => t.value === clientType)?.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Actividad</dt>
                  <dd className="text-[#1A1A2E] font-medium">{formData.actividad || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Facturación anual</dt>
                  <dd className="text-[#1A1A2E] font-medium">
                    {formData.facturacionAnual ? formatARS(Number(formData.facturacionAnual)) : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Documents Checklist */}
          <Card className="border border-[#E5E7EB]">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#1A1A2E] mb-4">Checklist de documentos</h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm">
                    {doc.estado === 'pendiente' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#E5E7EB]" />
                    ) : (
                      <Check className="w-4 h-4 text-[#22C55E]" />
                    )}
                    <span className={doc.estado === 'pendiente' ? 'text-[#6B7280]' : 'text-[#1A1A2E]'}>
                      {doc.nombre}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#F4F5F9] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#374151]">Progreso de documentación</span>
            <span className="text-sm font-bold text-[#1B3FD8]">{uploadedDocs.length} de {documents.length} completados</span>
          </div>
          <Progress value={(uploadedDocs.length / documents.length) * 100} className="h-2" />
        </div>

        {/* Alerts */}
        {pendingDocs.length > 0 && (
          <Alert className="bg-[#FEE2E2] border-[#EF4444]/30">
            <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
            <AlertDescription className="text-[#B91C1C]">
              Faltan {pendingDocs.length} documento(s) obligatorio(s): {pendingDocs.map(d => d.nombre).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {pendingDocs.length === 0 && (
          <Alert className="bg-[#DCFCE7] border-[#22C55E]/30">
            <Check className="w-4 h-4 text-[#15803D]" />
            <AlertDescription className="text-[#15803D]">
              Todos los documentos obligatorios están completos. Podés enviar tu solicitud.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F9]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold tracking-[0.12em] text-[#1B3FD8]">WORCAP</span>
            {client && (
              <>
                <div className="w-px h-6 bg-[#E5E7EB]" />
                <span className="text-sm text-[#374151]">{client.razonSocial}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#1B3FD8] font-medium">{completitud}% completado</span>
            <Button
              variant="outline"
              onClick={() => setRole(null)}
              className="border-[#E5E7EB] text-[#374151]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Guardar y salir
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Tracker */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <ProgressTracker
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card className="bg-white border border-[#E5E7EB] rounded-xl">
          <CardContent className="p-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-[#E5E7EB] text-[#374151]"
          >
            Anterior
          </Button>
          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={documents.filter(d => d.obligatorio && d.estado === 'pendiente').length > 0}
              className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
            >
              Enviar solicitud
            </Button>
          )}
        </div>
      </main>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-12 h-12 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-[#22C55E]" />
              </div>
              <span className="text-[#1A1A2E]">Solicitud enviada</span>
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-[#374151]">
              Tu solicitud ha sido enviada correctamente. Un analista la revisará a la brevedad.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center">
            <div className="bg-[#F4F5F9] rounded-lg p-4 mb-4">
              <p className="text-xs text-[#6B7280]">Número de expediente</p>
              <p className="text-lg font-bold text-[#1B3FD8]">{expediente}</p>
            </div>
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                setRole(null)
              }}
              className="w-full bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
            >
              Volver al inicio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
