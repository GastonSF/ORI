'use client'

import { useState, useRef } from 'react'
import { User, FileText, Users, Building2, Handshake, Landmark, X, Check, AlertCircle, Upload, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { cn, formatCUIT, formatARS, calcularCompletitud, generateId } from '@/lib/utils'
import { CLIENT_TYPES, SECTORS, PROVINCES, MONOTRIBUTO_CATEGORIES, DOCUMENT_REQUIREMENTS, ENTITY_TYPES } from '@/lib/constants'
import type { ClientType, Document, Socio, Director, Autoridad, Client } from '@/lib/types'
import { generateExpediente, getUserByRole } from '@/lib/mockData'

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

interface OfficerNewClientWizardProps {
  onClose: () => void
  onComplete: (client: Client) => void
}

export function OfficerNewClientWizard({ onClose, onComplete }: OfficerNewClientWizardProps) {
  const { showToast, addClient } = useApp()
  const user = getUserByRole('oficial')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [clientType, setClientType] = useState<ClientType>('SRL')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [expediente, setExpediente] = useState('')
  const [activeDocId, setActiveDocId] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    razonSocial: '',
    cuit: '',
    email: '',
    telefono: '',
    domicilio: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    actividad: '',
    fechaInicioActividad: '',
    facturacionAnual: '',
    // Monotributo
    categoriaMono: '',
    // RI
    tieneEmpleados: false,
    cantidadEmpleados: '',
    // Cooperativa
    numeroMatricula: '',
    // Entidad Financiera
    autorizacionBCRA: '',
    tipoEntidad: '',
    capitalMinimo: '',
    // Solicitud
    montoSolicitado: '',
    plazo: '',
    analistaAsignado: 'Laura Gómez',
    comentarios: '',
  })

  // Socios/Directores/Autoridades
  const [socios, setSocios] = useState<Socio[]>([])
  const [directores, setDirectores] = useState<Director[]>([])
  const [autoridades, setAutoridades] = useState<Autoridad[]>([])

  // Documents based on client type
  const [documents, setDocuments] = useState<Document[]>(() => {
    return DOCUMENT_REQUIREMENTS[clientType].map(doc => ({
      id: doc.id,
      nombre: doc.nombre,
      estado: 'pendiente',
      obligatorio: doc.obligatorio,
    }))
  })

  const completitud = calcularCompletitud(documents)

  const handleNext = () => {
    // Validate current step
    if (currentStep === 2) {
      if (!formData.razonSocial || !formData.cuit || !formData.email) {
        showToast('Completá los campos obligatorios antes de continuar', 'error')
        return
      }
    }
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
    setActiveDocId(docId)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && activeDocId) {
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === activeDocId
            ? { ...doc, estado: 'subido', fechaCarga: new Date(), archivo: file.name }
            : doc
        )
      )
      showToast(`Documento "${file.name}" cargado correctamente`, 'success')
      setActiveDocId(null)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveDocument = (docId: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId
          ? { ...doc, estado: 'pendiente', fechaCarga: undefined, archivo: undefined }
          : doc
      )
    )
  }

  const handleSubmit = () => {
    const pendingDocs = documents.filter(d => d.obligatorio && d.estado === 'pendiente')
    if (pendingDocs.length > 0) {
      showToast('Completá los documentos obligatorios antes de continuar', 'error')
      return
    }

    const exp = generateExpediente()
    setExpediente(exp)

    // Create the complete client object
    const newClient: Client = {
      id: generateId(),
      razonSocial: formData.razonSocial,
      cuit: formData.cuit,
      email: formData.email,
      tipo: clientType,
      telefono: formData.telefono,
      domicilio: formData.domicilio,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      codigoPostal: formData.codigoPostal,
      actividad: formData.actividad,
      sector: formData.actividad || 'Sin especificar',
      estado: 'enRevision', // Goes directly to analyst queue
      completitud: 100,
      montoSolicitado: Number(formData.montoSolicitado) || 0,
      plazo: Number(formData.plazo) || 12,
      facturacionAnual: Number(formData.facturacionAnual) || 0,
      analistaAsignado: formData.analistaAsignado,
      documentos: documents.map(d => ({ ...d, estado: d.estado === 'subido' ? 'enRevision' : d.estado })),
      socios: clientType === 'SRL' ? socios : undefined,
      directores: clientType === 'SA' ? directores : undefined,
      autoridades: clientType === 'cooperativa' ? autoridades : undefined,
      categoriaMono: clientType === 'monotributo' ? formData.categoriaMono : undefined,
      tieneEmpleados: clientType === 'RI' ? formData.tieneEmpleados : undefined,
      cantidadEmpleados: clientType === 'RI' && formData.tieneEmpleados ? Number(formData.cantidadEmpleados) : undefined,
      numeroMatricula: clientType === 'cooperativa' ? formData.numeroMatricula : undefined,
      autorizacionBCRA: clientType === 'entidadFinanciera' ? formData.autorizacionBCRA : undefined,
      tipoEntidad: clientType === 'entidadFinanciera' ? formData.tipoEntidad : undefined,
      capitalMinimo: clientType === 'entidadFinanciera' ? Number(formData.capitalMinimo) : undefined,
      fechaCreacion: new Date(),
      historial: [
        { id: generateId(), fecha: new Date(), accion: 'Solicitud creada por oficial', usuario: user.nombre },
        { id: generateId(), fecha: new Date(), accion: 'Carpeta completa enviada al backoffice', usuario: user.nombre },
      ],
      notasInternas: formData.comentarios,
      expediente: exp,
    }

    addClient(newClient)
    setShowSuccessModal(true)
    showToast(`Solicitud enviada al backoffice. Expediente N° ${exp}`, 'success')
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
    // Reset structure data
    setSocios([])
    setDirectores([])
    setAutoridades([])
  }

  // Add socio with editable fields
  const addSocio = () => {
    setSocios([...socios, { id: `socio-${Date.now()}`, nombre: '', dni: '', participacion: 0, firmaAutorizada: false }])
  }

  const updateSocio = (id: string, field: keyof Socio, value: string | number | boolean) => {
    setSocios(socios.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeSocio = (id: string) => {
    setSocios(socios.filter(s => s.id !== id))
  }

  // Add director with editable fields  
  const addDirector = () => {
    setDirectores([...directores, { id: `dir-${Date.now()}`, nombre: '', cargo: '', dni: '', participacion: 0 }])
  }

  const updateDirector = (id: string, field: keyof Director, value: string | number) => {
    setDirectores(directores.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const removeDirector = (id: string) => {
    setDirectores(directores.filter(d => d.id !== id))
  }

  // Add autoridad with editable fields
  const addAutoridad = () => {
    setAutoridades([...autoridades, { id: `aut-${Date.now()}`, nombre: '', cargo: '', periodo: '' }])
  }

  const updateAutoridad = (id: string, field: keyof Autoridad, value: string) => {
    setAutoridades(autoridades.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const removeAutoridad = (id: string) => {
    setAutoridades(autoridades.filter(a => a.id !== id))
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
      <h2 className="text-xl font-semibold text-[#1A1A2E]">Datos generales del cliente</h2>
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

      {/* Credit Request Info */}
      <div className="border-t border-[#E5E7EB] pt-6 mt-6">
        <h3 className="text-lg font-semibold text-[#1A1A2E] mb-4">Información de la solicitud</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Monto solicitado (ARS)</label>
            <Input
              type="number"
              value={formData.montoSolicitado}
              onChange={e => setFormData({ ...formData, montoSolicitado: e.target.value })}
              placeholder="10000000"
              className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
            />
            {formData.montoSolicitado && (
              <p className="text-xs text-[#6B7280] mt-1">{formatARS(Number(formData.montoSolicitado))}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Plazo (meses)</label>
            <Input
              type="number"
              value={formData.plazo}
              onChange={e => setFormData({ ...formData, plazo: e.target.value })}
              placeholder="24"
              className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Analista a asignar</label>
            <Select
              value={formData.analistaAsignado}
              onValueChange={val => setFormData({ ...formData, analistaAsignado: val })}
            >
              <SelectTrigger className="border-[#E5E7EB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laura Gómez">Laura Gómez</SelectItem>
                <SelectItem value="Sin asignar">Sin asignar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#374151] mb-1">Comentarios internos</label>
            <Textarea
              value={formData.comentarios}
              onChange={e => setFormData({ ...formData, comentarios: e.target.value })}
              placeholder="Notas adicionales para el analista..."
              className="border-[#E5E7EB] focus:border-[#1B3FD8] focus:ring-[#1B3FD8]"
            />
          </div>
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
          <p className="text-sm text-[#6B7280]">Agregá todos los socios de la SRL con su porcentaje de participación</p>
          
          {socios.length > 0 && (
            <div className="space-y-4">
              {socios.map((socio, index) => (
                <Card key={socio.id} className="border border-[#E5E7EB]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#374151]">Socio {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSocio(socio.id)}
                        className="text-[#EF4444] hover:text-[#B91C1C] hover:bg-[#FEE2E2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-[#6B7280] mb-1">Nombre completo</label>
                        <Input
                          value={socio.nombre}
                          onChange={e => updateSocio(socio.id, 'nombre', e.target.value)}
                          placeholder="Nombre del socio"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">DNI</label>
                        <Input
                          value={socio.dni}
                          onChange={e => updateSocio(socio.id, 'dni', e.target.value)}
                          placeholder="12345678"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">% Participación</label>
                        <Input
                          type="number"
                          value={socio.participacion || ''}
                          onChange={e => updateSocio(socio.id, 'participacion', Number(e.target.value))}
                          placeholder="50"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={addSocio}
            className="border-[#1B3FD8] text-[#1B3FD8] hover:bg-[#E8EDFD]"
          >
            + Agregar socio
          </Button>

          {socios.length > 0 && (
            <div className="bg-[#F4F5F9] rounded-lg p-3 text-sm">
              <span className="text-[#6B7280]">Total participación: </span>
              <span className={cn(
                'font-medium',
                socios.reduce((sum, s) => sum + (s.participacion || 0), 0) === 100 
                  ? 'text-[#15803D]' 
                  : 'text-[#B91C1C]'
              )}>
                {socios.reduce((sum, s) => sum + (s.participacion || 0), 0)}%
              </span>
              {socios.reduce((sum, s) => sum + (s.participacion || 0), 0) !== 100 && (
                <span className="text-[#B91C1C] ml-2">(debe sumar 100%)</span>
              )}
            </div>
          )}
        </div>
      )
    }

    if (clientType === 'SA') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Directorio</h2>
          <p className="text-sm text-[#6B7280]">Agregá los directores de la sociedad anónima</p>
          
          {directores.length > 0 && (
            <div className="space-y-4">
              {directores.map((director, index) => (
                <Card key={director.id} className="border border-[#E5E7EB]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#374151]">Director {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDirector(director.id)}
                        className="text-[#EF4444] hover:text-[#B91C1C] hover:bg-[#FEE2E2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-[#6B7280] mb-1">Nombre completo</label>
                        <Input
                          value={director.nombre}
                          onChange={e => updateDirector(director.id, 'nombre', e.target.value)}
                          placeholder="Nombre del director"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Cargo</label>
                        <Select
                          value={director.cargo}
                          onValueChange={val => updateDirector(director.id, 'cargo', val)}
                        >
                          <SelectTrigger className="border-[#E5E7EB]">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Presidente">Presidente</SelectItem>
                            <SelectItem value="Vicepresidente">Vicepresidente</SelectItem>
                            <SelectItem value="Director Titular">Director Titular</SelectItem>
                            <SelectItem value="Director Suplente">Director Suplente</SelectItem>
                            <SelectItem value="Síndico">Síndico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">DNI</label>
                        <Input
                          value={director.dni}
                          onChange={e => updateDirector(director.id, 'dni', e.target.value)}
                          placeholder="12345678"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={addDirector}
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
          
          <p className="text-sm text-[#6B7280]">Agregá las autoridades de la cooperativa</p>
          
          {autoridades.length > 0 && (
            <div className="space-y-4">
              {autoridades.map((autoridad, index) => (
                <Card key={autoridad.id} className="border border-[#E5E7EB]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#374151]">Autoridad {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAutoridad(autoridad.id)}
                        className="text-[#EF4444] hover:text-[#B91C1C] hover:bg-[#FEE2E2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Nombre completo</label>
                        <Input
                          value={autoridad.nombre}
                          onChange={e => updateAutoridad(autoridad.id, 'nombre', e.target.value)}
                          placeholder="Nombre"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Cargo</label>
                        <Select
                          value={autoridad.cargo}
                          onValueChange={val => updateAutoridad(autoridad.id, 'cargo', val)}
                        >
                          <SelectTrigger className="border-[#E5E7EB]">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Presidente">Presidente</SelectItem>
                            <SelectItem value="Secretario">Secretario</SelectItem>
                            <SelectItem value="Tesorero">Tesorero</SelectItem>
                            <SelectItem value="Vocal">Vocal</SelectItem>
                            <SelectItem value="Síndico">Síndico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Período</label>
                        <Input
                          value={autoridad.periodo}
                          onChange={e => updateAutoridad(autoridad.id, 'periodo', e.target.value)}
                          placeholder="2023-2025"
                          className="border-[#E5E7EB]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={addAutoridad}
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

  // Step 4: Documentation with drag & drop
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Documentación requerida</h2>
          <p className="text-sm text-[#6B7280] mt-1">Cargá los documentos del cliente uno por uno</p>
        </div>
        <span className="text-sm text-[#6B7280]">
          {documents.filter(d => d.estado !== 'pendiente').length} de {documents.length} cargados
        </span>
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
      
      <div className="space-y-3">
        {documents.map(doc => (
          <div 
            key={doc.id} 
            className={cn(
              "bg-white border rounded-lg p-4 transition-all",
              doc.estado === 'pendiente' 
                ? "border-[#E5E7EB] hover:border-[#1B3FD8] cursor-pointer" 
                : "border-[#22C55E]/30 bg-[#DCFCE7]/20"
            )}
            onClick={() => doc.estado === 'pendiente' && handleUploadDocument(doc.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1A1A2E]">{doc.nombre}</span>
                  {doc.obligatorio && <span className="text-[#EF4444] text-xs">*</span>}
                </div>
                {doc.estado !== 'pendiente' && doc.archivo && (
                  <p className="text-xs text-[#6B7280] mt-1">{doc.archivo}</p>
                )}
              </div>
              <div className="flex-shrink-0 ml-4 flex items-center gap-2">
                {doc.estado === 'pendiente' ? (
                  <div className="flex items-center gap-2 text-[#1B3FD8]">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Subir archivo</span>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-[#15803D] flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Cargado
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveDocument(doc.id)
                      }}
                      className="text-[#6B7280] hover:text-[#EF4444] hover:bg-[#FEE2E2] h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drop zone hint */}
      <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center">
        <Upload className="w-8 h-8 text-[#6B7280] mx-auto mb-2" />
        <p className="text-sm text-[#6B7280]">
          Hacé click en cada documento para cargarlo
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">
          Formatos aceptados: PDF, JPG, PNG, DOC, DOCX
        </p>
      </div>
    </div>
  )

  // Step 5: Review and Submit
  const renderStep5 = () => {
    const pendingDocs = documents.filter(d => d.obligatorio && d.estado === 'pendiente')
    const uploadedDocs = documents.filter(d => d.estado !== 'pendiente')

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[#1A1A2E]">Revisión y envío al backoffice</h2>
        
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
                  <dt className="text-[#6B7280]">Email</dt>
                  <dd className="text-[#1A1A2E] font-medium">{formData.email}</dd>
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

          {/* Request Summary */}
          <Card className="border border-[#E5E7EB]">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#1A1A2E] mb-4">Solicitud de crédito</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Monto solicitado</dt>
                  <dd className="text-[#1A1A2E] font-medium">
                    {formData.montoSolicitado ? formatARS(Number(formData.montoSolicitado)) : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Plazo</dt>
                  <dd className="text-[#1A1A2E] font-medium">{formData.plazo ? `${formData.plazo} meses` : '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Analista asignado</dt>
                  <dd className="text-[#1A1A2E] font-medium">{formData.analistaAsignado}</dd>
                </div>
              </dl>

              {/* Structure summary */}
              {clientType === 'SRL' && socios.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-2">{socios.length} socios registrados</p>
                </div>
              )}
              {clientType === 'SA' && directores.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-2">{directores.length} directores registrados</p>
                </div>
              )}
              {clientType === 'cooperativa' && autoridades.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-2">{autoridades.length} autoridades registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documents Checklist */}
        <Card className="border border-[#E5E7EB]">
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#1A1A2E] mb-4">Checklist de documentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  {doc.obligatorio && doc.estado === 'pendiente' && (
                    <span className="text-[#EF4444] text-xs">*</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              Todos los documentos obligatorios están completos. La carpeta está lista para enviar al backoffice.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#F4F5F9] z-50 overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#1A1A2E]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <div className="w-px h-6 bg-[#E5E7EB]" />
            <span className="text-lg font-bold tracking-[0.12em] text-[#1B3FD8]">WORCAP</span>
            <span className="text-sm text-[#374151]">Nueva solicitud de crédito</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#1B3FD8] font-medium">{completitud}% completado</span>
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
              Enviar al backoffice
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
        <span className="text-[#1A1A2E]">Carpeta enviada al backoffice</span>
        </DialogTitle>
        <DialogDescription className="text-center text-sm text-[#374151]">
        La carpeta completa ha sido enviada al backoffice para revisión por un analista.
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
                onClose()
              }}
              className="w-full bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
            >
              Volver al panel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
