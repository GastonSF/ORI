'use client'

import { useState } from 'react'
import { Home, Users, Plus, Mail, BarChart2, Settings, Search, MoreHorizontal, Send, Clock, FileText, Calendar, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sidebar } from '@/components/layout/Sidebar'
import { MetricCard } from '@/components/shared/MetricCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DocumentItem } from '@/components/shared/DocumentItem'
import { useApp } from '@/context/AppContext'
import { formatARS, formatDate } from '@/lib/utils'
import { CLIENT_TYPES } from '@/lib/constants'
import { getUserByRole } from '@/lib/mockData'
import { OfficerNewClientWizard } from './OfficerNewClientWizard'
import type { Client } from '@/lib/types'

const SIDEBAR_ITEMS = [
  { id: 'panel', label: 'Panel principal', icon: 'Home' },
  { id: 'clientes', label: 'Clientes', icon: 'Users' },
  { id: 'nueva', label: 'Nueva solicitud', icon: 'Plus' },
  { id: 'invitaciones', label: 'Invitaciones enviadas', icon: 'Mail' },
  { id: 'reportes', label: 'Reportes', icon: 'BarChart2' },
  { id: 'config', label: 'Configuración', icon: 'Settings' },
]

export function OfficerDashboard() {
  const { state, showToast, addClient, selectClient, setRole, updateDocStatus } = useApp()
  const { clients } = state
  const user = getUserByRole('oficial')

  const [activeItem, setActiveItem] = useState('clientes')
  const [showNewClientWizard, setShowNewClientWizard] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Metrics
  const totalSolicitudes = clients.length
  const enProceso = clients.filter(c => c.estado === 'enRevision').length
  const pendientes = clients.filter(c => c.estado === 'pendienteDocumentos' || c.estado === 'incompleto').length
  const aprobadas = clients.filter(c => c.estado === 'aprobado').length

  // Filtered clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.razonSocial.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.cuit.includes(searchQuery)
    const matchesStatus = filterStatus === 'all' || client.estado === filterStatus
    const matchesType = filterType === 'all' || client.tipo === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    selectClient(client.id)
  }

  const handleSendReminder = (client: Client) => {
    showToast(`Recordatorio enviado a ${client.email}`, 'success')
  }

  // Render client list
  const renderClientList = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Solicitudes activas</h1>
        <Button
          onClick={() => setShowNewClientWizard(true)}
          className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva solicitud
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total de solicitudes" value={totalSolicitudes} />
        <MetricCard label="En proceso" value={enProceso} />
        <MetricCard label="Pendientes de documentos" value={pendientes} />
        <MetricCard label="Aprobadas este mes" value={aprobadas} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg border border-[#E5E7EB] p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input
              placeholder="Buscar por nombre o CUIT..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 border-[#E5E7EB]"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] border-[#E5E7EB]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendienteDocumentos">Pendiente de documentos</SelectItem>
            <SelectItem value="enRevision">En revisión</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
            <SelectItem value="incompleto">Incompleto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] border-[#E5E7EB]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {CLIENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F4F5F9]">
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Cliente</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">CUIT</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Tipo</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Completitud</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Monto</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Asignado a</th>
              <th className="text-left py-3 px-4 font-medium text-[#374151]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => (
              <tr key={client.id} className="border-b border-[#E5E7EB] hover:bg-[#F4F5F9]/50">
                <td className="py-3 px-4">
                  <span className="font-medium text-[#1A1A2E]">{client.razonSocial}</span>
                </td>
                <td className="py-3 px-4 text-[#374151]">{client.cuit}</td>
                <td className="py-3 px-4 text-[#374151]">
                  {CLIENT_TYPES.find(t => t.value === client.tipo)?.label}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={client.estado} variant="client" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Progress value={client.completitud} className="w-16 h-2" />
                    <span className="text-[#374151]">{client.completitud}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#374151]">{formatARS(client.montoSolicitado)}</td>
                <td className="py-3 px-4 text-[#374151]">{client.analistaAsignado || '-'}</td>
                <td className="py-3 px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewClient(client)}>
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendReminder(client)}>
                        Enviar recordatorio
                      </DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Render client detail
  const renderClientDetail = () => {
    if (!selectedClient) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedClient(null)}
              className="mb-2 text-[#6B7280] hover:text-[#1A1A2E]"
            >
              ← Volver a la lista
            </Button>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">{selectedClient.razonSocial}</h1>
            <p className="text-sm text-[#6B7280]">{selectedClient.cuit}</p>
          </div>
          <StatusBadge status={selectedClient.estado} variant="client" />
        </div>

        <Tabs defaultValue="datos" className="w-full">
          <TabsList className="bg-[#F4F5F9] p-1">
            <TabsTrigger value="datos" className="data-[state=active]:bg-white">Datos del cliente</TabsTrigger>
            <TabsTrigger value="documentos" className="data-[state=active]:bg-white">Documentos</TabsTrigger>
            <TabsTrigger value="historial" className="data-[state=active]:bg-white">Historial</TabsTrigger>
            <TabsTrigger value="notas" className="data-[state=active]:bg-white">Notas internas</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="mt-4">
            <Card className="border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#1A1A2E]">Información general</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Razón social</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.razonSocial}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">CUIT</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.cuit}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Tipo</dt>
                        <dd className="text-[#1A1A2E] font-medium">
                          {CLIENT_TYPES.find(t => t.value === selectedClient.tipo)?.label}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Sector</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.sector}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Email</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.email}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Teléfono</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.telefono || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#1A1A2E]">Información de la solicitud</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Monto solicitado</dt>
                        <dd className="text-[#1A1A2E] font-medium">{formatARS(selectedClient.montoSolicitado)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Plazo</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.plazo} meses</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Analista asignado</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.analistaAsignado || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Fecha de creación</dt>
                        <dd className="text-[#1A1A2E] font-medium">{formatDate(selectedClient.fechaCreacion)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6B7280]">Completitud</dt>
                        <dd className="text-[#1A1A2E] font-medium">{selectedClient.completitud}%</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Socios / Directores */}
                {selectedClient.socios && selectedClient.socios.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                    <h3 className="font-semibold text-[#1A1A2E] mb-4">Socios</h3>
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
                            <td className="py-2 text-[#1A1A2E]">{s.nombre}</td>
                            <td className="py-2 text-[#374151]">{s.dni}</td>
                            <td className="py-2 text-[#374151]">{s.participacion}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedClient.directores && selectedClient.directores.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                    <h3 className="font-semibold text-[#1A1A2E] mb-4">Directorio</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB]">
                          <th className="text-left py-2 text-[#6B7280]">Nombre</th>
                          <th className="text-left py-2 text-[#6B7280]">Cargo</th>
                          <th className="text-left py-2 text-[#6B7280]">DNI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClient.directores.map(d => (
                          <tr key={d.id} className="border-b border-[#E5E7EB]">
                            <td className="py-2 text-[#1A1A2E]">{d.nombre}</td>
                            <td className="py-2 text-[#374151]">{d.cargo}</td>
                            <td className="py-2 text-[#374151]">{d.dni}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos" className="mt-4">
            <Card className="border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {selectedClient.documentos.length === 0 ? (
                    <p className="text-center text-[#6B7280] py-8">
                      No hay documentos cargados aún.
                    </p>
                  ) : (
                    selectedClient.documentos.map(doc => (
                      <DocumentItem
                        key={doc.id}
                        document={doc}
                        mode="client"
                        onUpload={() => {
                          updateDocStatus(selectedClient.id, doc.id, 'subido')
                          showToast('Documento cargado correctamente', 'success')
                        }}
                        onReupload={() => {
                          updateDocStatus(selectedClient.id, doc.id, 'subido')
                          showToast('Documento cargado correctamente', 'success')
                        }}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial" className="mt-4">
            <Card className="border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {selectedClient.historial?.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#E8EDFD] flex items-center justify-center">
                          <Clock className="w-4 h-4 text-[#1B3FD8]" />
                        </div>
                        {index < (selectedClient.historial?.length || 0) - 1 && (
                          <div className="w-px h-full bg-[#E5E7EB] my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-[#1A1A2E]">{entry.accion}</p>
                        <p className="text-xs text-[#6B7280]">
                          {formatDate(entry.fecha)} • {entry.usuario}
                        </p>
                        {entry.detalle && (
                          <p className="text-xs text-[#374151] mt-1">{entry.detalle}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notas" className="mt-4">
            <Card className="border border-[#E5E7EB]">
              <CardContent className="p-6">
                <Textarea
                  placeholder="Agregar notas internas sobre el cliente..."
                  defaultValue={selectedClient.notasInternas}
                  className="min-h-[200px] border-[#E5E7EB]"
                />
                <Button className="mt-4 bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white">
                  Guardar notas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex">
      <Sidebar
        role="oficial"
        items={SIDEBAR_ITEMS}
        activeItem={activeItem}
        onItemClick={(id) => {
          if (id === 'nueva') {
            setShowNewClientWizard(true)
          } else {
            setActiveItem(id)
            setSelectedClient(null)
          }
        }}
        userName={user.nombre}
        subtitle={`Sucursal ${user.sucursal}`}
      />

      <main className="flex-1 ml-60 p-8">
        {selectedClient ? renderClientDetail() : renderClientList()}
      </main>

      {/* New Client Wizard - Full guided form */}
      {showNewClientWizard && (
        <OfficerNewClientWizard
          onClose={() => setShowNewClientWizard(false)}
          onComplete={(client) => {
            setShowNewClientWizard(false)
            showToast(`Solicitud de ${client.razonSocial} creada correctamente`, 'success')
          }}
        />
      )}
    </div>
  )
}
