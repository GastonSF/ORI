'use client'

import React, { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { AppState, AppAction, AppRole, Client, Toast } from '@/lib/types'
import { mockClients, mockUsers } from '@/lib/mockData'
import { generateId, calcularCompletitud } from '@/lib/utils'

const initialState: AppState = {
  role: null,
  activeClient: null,
  clients: mockClients,
  users: mockUsers,
  toasts: [],
  wizardStep: 1,
  selectedClientId: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.payload }
    
    case 'SET_ACTIVE_CLIENT':
      return { ...state, activeClient: action.payload }
    
    case 'SELECT_CLIENT':
      const selectedClient = state.clients.find(c => c.id === action.payload) || null
      return { ...state, selectedClientId: action.payload, activeClient: selectedClient }
    
    case 'UPDATE_DOC_STATUS': {
      const { clientId, docId, estado, motivo } = action.payload
      const updatedClients = state.clients.map(client => {
        if (client.id !== clientId) return client
        const updatedDocs = client.documentos.map(doc => {
          if (doc.id !== docId) return doc
          return {
            ...doc,
            estado,
            motivoRechazo: motivo,
            fechaCarga: estado === 'subido' ? new Date() : doc.fechaCarga,
          }
        })
        return {
          ...client,
          documentos: updatedDocs,
          completitud: calcularCompletitud(updatedDocs),
        }
      })
      const updatedActiveClient = updatedClients.find(c => c.id === clientId) || state.activeClient
      return { ...state, clients: updatedClients, activeClient: updatedActiveClient }
    }
    
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] }
    
    case 'UPDATE_CLIENT': {
      const updatedClients = state.clients.map(c => 
        c.id === action.payload.id ? action.payload : c
      )
      const updatedActive = state.activeClient?.id === action.payload.id ? action.payload : state.activeClient
      return { ...state, clients: updatedClients, activeClient: updatedActive }
    }
    
    case 'ADVANCE_WIZARD_STEP':
      return { ...state, wizardStep: Math.min(state.wizardStep + 1, 5) }
    
    case 'SET_WIZARD_STEP':
      return { ...state, wizardStep: action.payload }
    
    case 'ADD_TOAST':
      const newToasts = [...state.toasts, action.payload].slice(-3) // Keep max 3
      return { ...state, toasts: newToasts }
    
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }
    
    case 'UPDATE_CHECKLIST': {
      const { clientId, itemId, checked, nota } = action.payload
      const updatedClients = state.clients.map(client => {
        if (client.id !== clientId) return client
        const updatedChecklist = client.checklist?.map(item => {
          if (item.id !== itemId) return item
          return { ...item, checked, nota: nota ?? item.nota }
        })
        return { ...client, checklist: updatedChecklist }
      })
      const updatedActiveClient = updatedClients.find(c => c.id === clientId) || state.activeClient
      return { ...state, clients: updatedClients, activeClient: updatedActiveClient }
    }
    
    case 'UPDATE_SCENARIOS': {
      const { clientId, escenarios } = action.payload
      const updatedClients = state.clients.map(client => {
        if (client.id !== clientId) return client
        return { ...client, escenarios }
      })
      const updatedActiveClient = updatedClients.find(c => c.id === clientId) || state.activeClient
      return { ...state, clients: updatedClients, activeClient: updatedActiveClient }
    }
    
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  setRole: (role: AppRole) => void
  selectClient: (id: string) => void
  updateDocStatus: (clientId: string, docId: string, estado: AppAction['type'] extends 'UPDATE_DOC_STATUS' ? AppAction['payload']['estado'] : never, motivo?: string) => void
  addClient: (client: Client) => void
  updateClient: (client: Client) => void
  showToast: (message: string, type: Toast['type'], duration?: number) => void
  advanceWizard: () => void
  setWizardStep: (step: number) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const setRole = (role: AppRole) => {
    dispatch({ type: 'SET_ROLE', payload: role })
    if (role === 'cliente') {
      // Set default client for cliente role
      dispatch({ type: 'SET_ACTIVE_CLIENT', payload: mockClients[0] })
    }
  }

  const selectClient = (id: string) => {
    dispatch({ type: 'SELECT_CLIENT', payload: id })
  }

  const updateDocStatus = (clientId: string, docId: string, estado: 'pendiente' | 'subido' | 'enRevision' | 'aprobado' | 'rechazado', motivo?: string) => {
    dispatch({ type: 'UPDATE_DOC_STATUS', payload: { clientId, docId, estado, motivo } })
  }

  const addClient = (client: Client) => {
    dispatch({ type: 'ADD_CLIENT', payload: client })
  }

  const updateClient = (client: Client) => {
    dispatch({ type: 'UPDATE_CLIENT', payload: client })
  }

  const showToast = (message: string, type: Toast['type'], duration = 4000) => {
    const id = generateId()
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type, duration } })
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id })
    }, duration)
  }

  const advanceWizard = () => {
    dispatch({ type: 'ADVANCE_WIZARD_STEP' })
  }

  const setWizardStep = (step: number) => {
    dispatch({ type: 'SET_WIZARD_STEP', payload: step })
  }

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      setRole,
      selectClient,
      updateDocStatus,
      addClient,
      updateClient,
      showToast,
      advanceWizard,
      setWizardStep,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
