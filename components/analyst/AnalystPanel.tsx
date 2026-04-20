'use client'

import { useState } from 'react'
import { Home, ClipboardList, CheckCircle, BarChart3, Settings, Clock, FileDown, Send, AlertCircle, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Sidebar } from '@/components/layout/Sidebar'
import { MetricCard } from '@/components/shared/MetricCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DocumentItem } from '@/components/shared/DocumentItem'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useApp } from '@/context/AppContext'
import { formatARS, formatDate, cn } from '@/lib/utils'
import { CLIENT_TYPES, RISK_RATINGS, VALIDATION_CHECKLIST } from '@/lib/constants'
import { getUserByRole } from '@/lib/mockData'
import type { Client, RiskRating, FinancialScenario } from '@/lib/types'

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'Home' },
  { id: 'cola', label: 'Cola de revisión', icon: 'ClipboardList' },
  { id: 'aprobados', label: 'Clientes aprobados', icon: 'CheckCircle' },
  { id: 'reportes', label: 'Reportes', icon: 'BarChart3' },
  { id: 'config', label: 'Configuración', icon: 'Settings' },
]

export function AnalystPanel() {
  const { state, showToast, updateDocStatus, dispatch } = useApp()
  const { clients } = state
  const user = getUserByRole('analista')

  const [activeItem, setActiveItem] = useState('cola')
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [dossierRecommendation, setDossierRecommendation] = useState('')

  const selectedClient = clients.find(c => c.id === selectedClientId) || clients[0]

  // KPIs
  const solicitudesEnCola = clients.filter(c => c.estado !== 'aprobado' && c.estado !== 'rechazado').length
  const revisadasHoy = 3
  const tasaAprobacion = Math.round((clients.filter(c => c.estado === 'aprobado').length / clients.length) * 100)
  const tiempoPromedio = 2.4

  // Filtered queue
  const queueClients = clients.filter(c => {
    if (filterStatus === 'all') return c.estado !== 'aprobado'
    return c.estado === filterStatus
  })

  // Document counts
  const docStats = selectedClient ? {
    aprobados: selectedClient.documentos.filter(d => d.estado === 'aprobado').length,
    rechazados: selectedClient.documentos.filter(d => d.estado === 'rechazado').length,
    pendientes: selectedClient.documentos.filter(d => d.estado === 'pendiente' || d.estado === 'subido' || d.estado === 'enRevision').length,
    total: selectedClient.documentos.length,
  } : { aprobados: 0, rechazados: 0, pendientes: 0, total: 0 }

  // Checklist progress
  const checklistProgress = selectedClient?.checklist 
    ? (selectedClient.checklist.filter(c => c.checked).length / selectedClient.checklist.length) * 100
    : 0

  const handleApproveDoc = (docId: string) => {
    if (selectedClient) {
      updateDocStatus(selectedClient.id, docId, 'aprobado')
      showToast('Documento aprobado', 'success')
    }
  }

  const handleRejectDoc = (docId: string) => {
    if (selectedClient) {
      updateDocStatus(selectedClient.id, docId, 'rechazado', 'Documento ilegible o incompleto')
      showToast('Documento rechazado. El cliente será notificado.', 'warning')
    }
  }

  const handleApproveRequest = () => {
    if (selectedClient) {
      const updatedClient = { ...selectedClient, estado: 'aprobado' as const, montoAprobado: selectedClient.montoSolicitado }
      dispatch({ type: 'UPDATE_CLIENT', payload: updatedClient })
      showToast('Solicitud aprobada exitosamente', 'success')
      setShowApproveDialog(false)
    }
  }

  const handleRejectRequest = () => {
    if (selectedClient && rejectReason) {
      const updatedClient = { ...selectedClient, estado: 'rechazado' as const }
      dispatch({ type: 'UPDATE_CLIENT', payload: updatedClient })
      showToast('Solicitud rechazada', 'warning')
      setShowRejectDialog(false)
      setRejectReason('')
    }
  }

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    if (selectedClient) {
      dispatch({
        type: 'UPDATE_CHECKLIST',
        payload: { clientId: selectedClient.id, itemId, checked }
      })
    }
  }

  const handleScenarioChange = (
    scenario: 'conservador' | 'base' | 'agresivo',
    field: keyof FinancialScenario,
    value: number | RiskRating
  ) => {
    if (selectedClient) {
      const currentEscenarios = selectedClient.escenarios || {
        conservador: { ingresos: 0, egresos: 0, ebitda: 0, ratioEndeudamiento: 0, coberturaDeuda: 0, probabilidadDefault: 0, calificacion: 'BBB' as RiskRating },
        base: { ingresos: 0, egresos: 0, ebitda: 0, ratioEndeudamiento: 0, coberturaDeuda: 0, probabilidadDefault: 0, calificacion: 'A' as RiskRating },
        agresivo: { ingresos: 0, egresos: 0, ebitda: 0, ratioEndeudamiento: 0, coberturaDeuda: 0, probabilidadDefault: 0, calificacion: 'AA' as RiskRating },
      }

      const updatedScenario = { ...currentEscenarios[scenario], [field]: value }
      
      // Auto-calculate EBITDA and coverage
      if (field === 'ingresos' || field === 'egresos') {
        updatedScenario.ebitda = updatedScenario.ingresos - updatedScenario.egresos
        const cuotaMensual = selectedClient.montoSolicitado / selectedClient.plazo
        updatedScenario.coberturaDeuda = cuotaMensual > 0 ? Number((updatedScenario.ebitda / 12 / cuotaMensual).toFixed(1)) : 0
      }

      const newEscenarios = { ...currentEscenarios, [scenario]: updatedScenario }
      dispatch({ type: 'UPDATE_SCENARIOS', payload: { clientId: selectedClient.id, escenarios: newEscenarios } })
    }
  }

  const getRiskColor = (cobertura: number) => {
    if (cobertura >= 2) return 'bg-[#22C55E]'
    if (cobertura >= 1.2) return 'bg-[#F59E0B]'
    return 'bg-[#EF4444]'
  }

  // Render Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A2E]">Dashboard del Analista</h1>
      
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Solicitudes en cola" value={solicitudesEnCola} />
        <MetricCard label="Revisadas hoy" value={revisadasHoy} />
        <MetricCard label="Tasa de aprobación" value={`${tasaAprobacion}%`} />
        <MetricCard label="Tiempo promedio de revisión" value={`${tiempoPromedio} días`} />
      </div>

      {/* Simple Bar Chart */}
      <Card className="border border-[#E5E7EB]">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#1A1A2E] mb-4">Solicitudes por semana (últimas 4 semanas)</h3>
          <div className="flex items-end gap-4 h-40">
            {[12, 8, 15, 10].map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-[#1B3FD8] rounded-t" 
                  style={{ height: `${(value / 15) * 100}%` }}
                />
                <span className="text-xs text-[#6B7280]">Sem {i + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Urgent Requests */}
      <Card className="border border-[#E5E7EB]">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#1A1A2E] mb-4">Solicitudes urgentes</h3>
          <div className="space-y-3">
            {clients
              .filter(c => c.diasEnCola && c.diasEnCola > 5 && c.estado !== 'aprobado')
              .slice(0, 3)
              .map(client => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-[#FEF3C7] rounded-lg">
                  <div>
                    <p className="font-medium text-[#1A1A2E]">{client.razonSocial}</p>
                    <p className="text-xs text-[#92400E]">{client.diasEnCola} días en cola</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedClientId(client.id)
                      setActiveItem('cola')
                    }}
                    className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
                  >
                    Revisar
                  </Button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render Review Queue
  const renderQueue = () => (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Client List */}
      <div className="w-80 border-r border-[#E5E7EB] bg-white overflow-y-auto">
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="flex gap-2">
            {['all', 'pendienteDocumentos', 'enRevision'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full transition-colors',
                  filterStatus === status
                    ? 'bg-[#1B3FD8] text-white'
                    : 'bg-[#F4F5F9] text-[#6B7280] hover:bg-[#E5E7EB]'
                )}
              >
                {status === 'all' ? 'Todas' : status === 'pendienteDocumentos' ? 'Pendientes' : 'En revisión'}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {queueClients.map(client => (
            <button
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className={cn(
                'w-full p-4 text-left transition-colors',
                selectedClientId === client.id
                  ? 'bg-[#E8EDFD] border-l-4 border-l-[#1B3FD8]'
                  : 'hover:bg-[#F4F5F9]'
              )}
            >
              <p className="font-medium text-[#1A1A2E] truncate">{client.razonSocial}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#6B7280]">
                  {CLIENT_TYPES.find(t => t.value === client.tipo)?.label}
                </span>
                <span className="text-xs text-[#6B7280]">•</span>
                <span className="text-xs text-[#6B7280]">{client.completitud}%</span>
              </div>
              {client.diasEnCola && (
                <p className="text-xs text-[#F59E0B] mt-1">{client.diasEnCola} días en cola</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Client Detail */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#F4F5F9]">
        {selectedClient ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A2E]">{selectedClient.razonSocial}</h1>
                <p className="text-sm text-[#6B7280]">{selectedClient.cuit} • {CLIENT_TYPES.find(t => t.value === selectedClient.tipo)?.label}</p>
              </div>
              <StatusBadge status={selectedClient.estado} variant="client" />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="datos" className="w-full">
              <TabsList className="bg-white p-1 border border-[#E5E7EB]">
                <TabsTrigger value="datos" className="data-[state=active]:bg-[#E8EDFD] data-[state=active]:text-[#1B3FD8]">Datos del cliente</TabsTrigger>
                <TabsTrigger value="documentos" className="data-[state=active]:bg-[#E8EDFD] data-[state=active]:text-[#1B3FD8]">Documentos</TabsTrigger>
                <TabsTrigger value="checklist" className="data-[state=active]:bg-[#E8EDFD] data-[state=active]:text-[#1B3FD8]">Checklist</TabsTrigger>
                <TabsTrigger value="escenarios" className="data-[state=active]:bg-[#E8EDFD] data-[state=active]:text-[#1B3FD8]">Escenarios</TabsTrigger>
                <TabsTrigger value="dossier" className="data-[state=active]:bg-[#E8EDFD] data-[state=active]:text-[#1B3FD8]">Dossier</TabsTrigger>
              </TabsList>

              {/* Tab: Client Data */}
              <TabsContent value="datos" className="mt-4">
                <Card className="border border-[#E5E7EB]">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-[#1A1A2E] border-b border-[#E5E7EB] pb-2">Información general</h3>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between"><dt className="text-[#6B7280]">CUIT</dt><dd className="font-medium">{selectedClient.cuit}</dd></div>
                          <div className="flex justify-between"><dt className="text-[#6B7280]">Razón social</dt><dd className="font-medium">{selectedClient.razonSocial}</dd></div>
                          <div className="flex justify-between"><dt className="text-[#6B7280]">Tipo</dt><dd className="font-medium">{CLIENT_TYPES.find(t => t.value === selectedClient.tipo)?.label}</dd></div>
                          <div className="flex justify-between"><dt className="text-[#6B7280]">Sector</dt><dd className="font-medium">{selectedClient.sector}</dd></div>
                        </dl>
                      </div>
                      <div className="space-y-4">
                        <h3 className="font-semibold text-[#1A1A2E] border-b border-[#E5E7EB] pb-2">Información financiera</h3>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between"><dt className="text-[#6B7280]">Facturación declarada</dt><dd className="font-medium">{formatARS(selectedClient.facturacionAnual || 0)}</dd></div>
                          <div className="flex justify-between"><dt className="text-[#6B7280]">Monto solicitado</dt><dd className="font-medium">{formatARS(selectedClient.montoSolicitado)}</dd></div>
                          <div className="flex justify-between"><dt className="text-[#6B7280]">Plazo</dt><dd className="font-medium">{selectedClient.plazo} meses</dd></div>
                        </dl>
                      </div>
                    </div>

                    {/* Socios / Directores */}
                    {selectedClient.socios && selectedClient.socios.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                        <h3 className="font-semibold text-[#1A1A2E] mb-4">Información societaria</h3>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#E5E7EB]">
                              <th className="text-left py-2 text-[#6B7280]">Nombre</th>
                              <th className="text-left py-2 text-[#6B7280]">DNI</th>
                              <th className="text-left py-2 text-[#6B7280]">Participación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedClient.socios.map(s => (
                              <tr key={s.id} className="border-b border-[#E5E7EB]">
                                <td className="py-2">{s.nombre}</td>
                                <td className="py-2">{s.dni}</td>
                                <td className="py-2">{s.participacion}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                      <h3 className="font-semibold text-[#1A1A2E] mb-4">Datos de contacto</h3>
                      <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between"><dt className="text-[#6B7280]">Email</dt><dd className="font-medium">{selectedClient.email}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#6B7280]">Teléfono</dt><dd className="font-medium">{selectedClient.telefono || '-'}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#6B7280]">Domicilio</dt><dd className="font-medium">{selectedClient.domicilio || '-'}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#6B7280]">Ciudad</dt><dd className="font-medium">{selectedClient.ciudad || '-'}, {selectedClient.provincia || '-'}</dd></div>
                      </dl>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Documents */}
              <TabsContent value="documentos" className="mt-4">
                <Card className="border border-[#E5E7EB]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[#1A1A2E]">Documentación</h3>
                      <span className="text-sm text-[#6B7280]">
                        {docStats.aprobados} aprobados / {docStats.rechazados} rechazados / {docStats.pendientes} pendientes de {docStats.total} total
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedClient.documentos.map(doc => (
                        <DocumentItem
                          key={doc.id}
                          document={doc}
                          mode="analyst"
                          onApprove={() => handleApproveDoc(doc.id)}
                          onReject={() => handleRejectDoc(doc.id)}
                          onView={() => showToast('Vista previa del documento', 'info')}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Validation Checklist */}
              <TabsContent value="checklist" className="mt-4">
                <Card className="border border-[#E5E7EB]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[#1A1A2E]">Checklist de validación</h3>
                      <span className="text-sm text-[#6B7280]">
                        {selectedClient.checklist?.filter(c => c.checked).length || 0}/7 ítems validados
                      </span>
                    </div>
                    <Progress value={checklistProgress} className="h-2 mb-6" />
                    <div className="space-y-4">
                      {selectedClient.checklist?.map(item => (
                        <div key={item.id} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={e => handleChecklistChange(item.id, e.target.checked)}
                            className="mt-1 rounded border-[#E5E7EB] text-[#1B3FD8] focus:ring-[#1B3FD8]"
                          />
                          <div className="flex-1">
                            <label className={cn(
                              'text-sm font-medium',
                              item.checked ? 'text-[#1A1A2E]' : 'text-[#6B7280]'
                            )}>
                              {item.label}
                            </label>
                            <Textarea
                              placeholder="Agregar nota..."
                              className="mt-2 h-16 text-xs border-[#E5E7EB]"
                              defaultValue={item.nota}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Financial Scenarios */}
              <TabsContent value="escenarios" className="mt-4">
                <Card className="border border-[#E5E7EB]">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-[#1A1A2E] mb-4">Escenarios financieros</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {(['conservador', 'base', 'agresivo'] as const).map(scenario => {
                        const data = selectedClient.escenarios?.[scenario] || {
                          ingresos: 0, egresos: 0, ebitda: 0, ratioEndeudamiento: 0, coberturaDeuda: 0, probabilidadDefault: 0, calificacion: 'BBB' as RiskRating
                        }
                        return (
                          <div key={scenario} className="bg-[#F4F5F9] rounded-lg p-4">
                            <h4 className="font-medium text-[#1A1A2E] capitalize mb-4">{scenario}</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-[#6B7280]">Ingresos proyectados (ARS)</label>
                                <Input
                                  type="number"
                                  value={data.ingresos}
                                  onChange={e => handleScenarioChange(scenario, 'ingresos', Number(e.target.value))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-[#6B7280]">Egresos proyectados (ARS)</label>
                                <Input
                                  type="number"
                                  value={data.egresos}
                                  onChange={e => handleScenarioChange(scenario, 'egresos', Number(e.target.value))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="bg-white rounded p-2">
                                <label className="text-xs text-[#6B7280]">EBITDA resultante</label>
                                <p className="font-bold text-[#1B3FD8]">{formatARS(data.ebitda)}</p>
                              </div>
                              <div>
                                <label className="text-xs text-[#6B7280]">Ratio de endeudamiento</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={data.ratioEndeudamiento}
                                  onChange={e => handleScenarioChange(scenario, 'ratioEndeudamiento', Number(e.target.value))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="bg-white rounded p-2">
                                <label className="text-xs text-[#6B7280]">Cobertura de deuda</label>
                                <p className="font-bold text-[#1A1A2E]">{data.coberturaDeuda}x</p>
                              </div>
                              <div>
                                <label className="text-xs text-[#6B7280]">Probabilidad de default (%)</label>
                                <Input
                                  type="number"
                                  value={data.probabilidadDefault}
                                  onChange={e => handleScenarioChange(scenario, 'probabilidadDefault', Number(e.target.value))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-[#6B7280]">Calificación interna</label>
                                <Select
                                  value={data.calificacion}
                                  onValueChange={val => handleScenarioChange(scenario, 'calificacion', val as RiskRating)}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RISK_RATINGS.map(r => (
                                      <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* Risk Indicator */}
                              <div className="flex items-center gap-2 pt-2">
                                <div className={cn('w-3 h-3 rounded-full', getRiskColor(data.coberturaDeuda))} />
                                <span className="text-xs text-[#6B7280]">
                                  {data.coberturaDeuda >= 2 ? 'Riesgo bajo' : data.coberturaDeuda >= 1.2 ? 'Riesgo medio' : 'Riesgo alto'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Dossier */}
              <TabsContent value="dossier" className="mt-4">
                <Card className="border border-[#E5E7EB]">
                  <CardContent className="p-6 text-center">
                    <FileDown className="w-12 h-12 text-[#1B3FD8] mx-auto mb-4" />
                    <h3 className="font-semibold text-[#1A1A2E] mb-2">Generar Dossier de Crédito</h3>
                    <p className="text-sm text-[#6B7280] mb-4">
                      Genera un documento consolidado con toda la información del expediente.
                    </p>
                    <Button
                      onClick={() => setShowDossierModal(true)}
                      className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
                    >
                      Generar dossier
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Actions Bar */}
            <div className="flex items-center justify-between bg-white rounded-lg border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-2">
                <Select defaultValue="Laura Gómez">
                  <SelectTrigger className="w-[180px] h-9 text-sm border-[#E5E7EB]">
                    <SelectValue placeholder="Asignar a analista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laura Gómez">Laura Gómez</SelectItem>
                    <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => showToast('Solicitud de información enviada al cliente', 'info')}
                  className="border-[#E5E7EB] text-[#374151]"
                >
                  Solicitar más información
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(true)}
                  className="border-[#EF4444] text-[#B91C1C] hover:bg-[#FEE2E2]"
                >
                  Rechazar solicitud
                </Button>
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  className="bg-[#22C55E] hover:bg-[#15803D] text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprobar solicitud
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#6B7280]">
            Seleccioná un cliente de la lista
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex">
      <Sidebar
        role="analista"
        items={SIDEBAR_ITEMS}
        activeItem={activeItem}
        onItemClick={setActiveItem}
        userName={user.nombre}
        subtitle={user.equipo}
      />

      <main className="flex-1 ml-60">
        {activeItem === 'dashboard' && <div className="p-8">{renderDashboard()}</div>}
        {activeItem === 'cola' && renderQueue()}
        {activeItem === 'aprobados' && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Clientes aprobados</h1>
            <div className="space-y-4">
              {clients.filter(c => c.estado === 'aprobado').map(client => (
                <Card key={client.id} className="border border-[#E5E7EB]">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1A1A2E]">{client.razonSocial}</p>
                      <p className="text-sm text-[#6B7280]">{client.cuit} • {formatARS(client.montoAprobado || 0)} aprobado</p>
                    </div>
                    <StatusBadge status="aprobado" variant="client" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Approve Dialog */}
      <ConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Aprobar solicitud"
        description={`¿Estás seguro de aprobar la solicitud de ${selectedClient?.razonSocial} por ${formatARS(selectedClient?.montoSolicitado || 0)}?`}
        confirmLabel="Aprobar"
        onConfirm={handleApproveRequest}
      />

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
<DialogHeader>
        <DialogTitle className="text-[#1A1A2E]">Rechazar solicitud</DialogTitle>
        <DialogDescription className="text-sm text-[#374151]">
        Por favor, ingresá el motivo del rechazo de la solicitud de {selectedClient?.razonSocial}.
        </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo (obligatorio)..."
              className="min-h-[100px] border-[#E5E7EB]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="border-[#E5E7EB]">
              Cancelar
            </Button>
            <Button
              onClick={handleRejectRequest}
              disabled={!rejectReason}
              className="bg-[#EF4444] hover:bg-[#B91C1C] text-white"
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dossier Modal */}
      <Dialog open={showDossierModal} onOpenChange={setShowDossierModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold tracking-[0.12em] text-[#1B3FD8]">WORCAP</span>
                <span className="text-sm text-[#6B7280]">Dossier de crédito</span>
              </div>
              <span className="text-sm text-[#6B7280]">{formatDate(new Date())}</span>
            </div>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6 py-4">
              {/* Section 1: Client Data */}
              <div className="border-b border-[#E5E7EB] pb-4">
                <h3 className="font-semibold text-[#1A1A2E] mb-3">1. Datos del solicitante</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-[#6B7280] inline">Razón social:</dt> <dd className="inline font-medium">{selectedClient.razonSocial}</dd></div>
                  <div><dt className="text-[#6B7280] inline">CUIT:</dt> <dd className="inline font-medium">{selectedClient.cuit}</dd></div>
                  <div><dt className="text-[#6B7280] inline">Tipo:</dt> <dd className="inline font-medium">{CLIENT_TYPES.find(t => t.value === selectedClient.tipo)?.label}</dd></div>
                  <div><dt className="text-[#6B7280] inline">Sector:</dt> <dd className="inline font-medium">{selectedClient.sector}</dd></div>
                  <div><dt className="text-[#6B7280] inline">Monto solicitado:</dt> <dd className="inline font-medium">{formatARS(selectedClient.montoSolicitado)}</dd></div>
                  <div><dt className="text-[#6B7280] inline">Plazo:</dt> <dd className="inline font-medium">{selectedClient.plazo} meses</dd></div>
                </dl>
              </div>

              {/* Section 2: Corporate Structure */}
              {selectedClient.socios && selectedClient.socios.length > 0 && (
                <div className="border-b border-[#E5E7EB] pb-4">
                  <h3 className="font-semibold text-[#1A1A2E] mb-3">2. Estructura societaria</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-1 text-[#6B7280]">Socio</th>
                        <th className="text-left py-1 text-[#6B7280]">DNI</th>
                        <th className="text-left py-1 text-[#6B7280]">Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClient.socios.map(s => (
                        <tr key={s.id}>
                          <td className="py-1">{s.nombre}</td>
                          <td className="py-1">{s.dni}</td>
                          <td className="py-1">{s.participacion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section 3: Documentation */}
              <div className="border-b border-[#E5E7EB] pb-4">
                <h3 className="font-semibold text-[#1A1A2E] mb-3">3. Resumen de documentación</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-1 text-[#6B7280]">Documento</th>
                      <th className="text-left py-1 text-[#6B7280]">Estado</th>
                      <th className="text-left py-1 text-[#6B7280]">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClient.documentos.map(doc => (
                      <tr key={doc.id}>
                        <td className="py-1">{doc.nombre}</td>
                        <td className="py-1"><StatusBadge status={doc.estado} /></td>
                        <td className="py-1">{formatDate(doc.fechaCarga)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 4: Validation Checklist */}
              <div className="border-b border-[#E5E7EB] pb-4">
                <h3 className="font-semibold text-[#1A1A2E] mb-3">4. Checklist de validación</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedClient.checklist?.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.checked ? (
                        <Check className="w-4 h-4 text-[#22C55E]" />
                      ) : (
                        <X className="w-4 h-4 text-[#EF4444]" />
                      )}
                      <span className={item.checked ? 'text-[#1A1A2E]' : 'text-[#6B7280]'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Financial Scenarios */}
              <div className="border-b border-[#E5E7EB] pb-4">
                <h3 className="font-semibold text-[#1A1A2E] mb-3">5. Escenarios financieros</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-1 text-[#6B7280]">Escenario</th>
                      <th className="text-left py-1 text-[#6B7280]">EBITDA</th>
                      <th className="text-left py-1 text-[#6B7280]">Cobertura</th>
                      <th className="text-left py-1 text-[#6B7280]">PD</th>
                      <th className="text-left py-1 text-[#6B7280]">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['conservador', 'base', 'agresivo'] as const).map(scenario => {
                      const data = selectedClient.escenarios?.[scenario]
                      return (
                        <tr key={scenario}>
                          <td className="py-1 capitalize">{scenario}</td>
                          <td className="py-1">{formatARS(data?.ebitda || 0)}</td>
                          <td className="py-1">{data?.coberturaDeuda || 0}x</td>
                          <td className="py-1">{data?.probabilidadDefault || 0}%</td>
                          <td className="py-1">{data?.calificacion || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Section 6: Recommendation */}
              <div>
                <h3 className="font-semibold text-[#1A1A2E] mb-3">6. Recomendación del analista</h3>
                <Textarea
                  value={dossierRecommendation}
                  onChange={e => setDossierRecommendation(e.target.value)}
                  placeholder="Ingresá tu recomendación..."
                  className="min-h-[100px] border-[#E5E7EB]"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#E5E7EB] text-sm text-[#6B7280]">
                Generado por: {user.nombre} | Worcap Credit Solutions
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                showToast('Dossier descargado', 'success')
              }}
              className="border-[#1B3FD8] text-[#1B3FD8] hover:bg-[#E8EDFD]"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button
              onClick={() => {
                showToast('Dossier enviado al comité', 'success')
                setShowDossierModal(false)
              }}
              className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar a comité
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
