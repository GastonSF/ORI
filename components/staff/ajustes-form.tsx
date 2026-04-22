"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Check, Lock, X } from "lucide-react"
import {
  updateProfileAction,
  changePasswordAction,
} from "@/lib/actions/profile"
import { ROLE_LABELS, type UserRole } from "@/lib/constants/roles"

type Props = {
  userName: string
  userEmail: string
  userPhone: string | null
  role: UserRole
}

export function AjustesForm({ userName, userEmail, userPhone, role }: Props) {
  // ===== Perfil =====
  const [fullName, setFullName] = useState(userName)
  const [phone, setPhone] = useState(userPhone ?? "")
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [savingProfile, startSavingProfile] = useTransition()

  const profileDirty =
    fullName.trim() !== userName.trim() ||
    (phone.trim() || null) !== (userPhone || null)

  const onSaveProfile = () => {
    setProfileErrors({})
    startSavingProfile(async () => {
      const res = await updateProfileAction({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      })
      if (!res.ok) {
        if (res.fieldErrors) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            if (v && v.length) flat[k] = v[0]
          }
          setProfileErrors(flat)
        }
        toast.error(res.error)
        return
      }
      toast.success("Perfil actualizado")
    })
  }

  // ===== Contraseña =====
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({})
  const [changingPwd, startChangingPwd] = useTransition()

  const resetPasswordForm = () => {
    setCurrentPwd("")
    setNewPwd("")
    setConfirmPwd("")
    setPwdErrors({})
  }

  const onChangePassword = () => {
    setPwdErrors({})
    startChangingPwd(async () => {
      const res = await changePasswordAction({
        current_password: currentPwd,
        new_password: newPwd,
        confirm_password: confirmPwd,
      })
      if (!res.ok) {
        if (res.fieldErrors) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            if (v && v.length) flat[k] = v[0]
          }
          setPwdErrors(flat)
        }
        toast.error(res.error)
        return
      }
      toast.success("Contraseña actualizada")
      resetPasswordForm()
      setShowPasswordForm(false)
    })
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ===== Sección Perfil ===== */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Perfil</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Información básica de tu cuenta.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {/* Full name */}
          <Field label="Nombre completo" error={profileErrors.full_name}>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-sm text-gray-900 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
              placeholder="Ej: Carlos Pérez"
              maxLength={120}
            />
          </Field>

          {/* Email (readonly) */}
          <Field label="Email" hint="No podés cambiarlo desde acá">
            <p className="text-sm text-gray-600 font-mono">{userEmail}</p>
          </Field>

          {/* Phone */}
          <Field label="Teléfono" error={profileErrors.phone} hint="Opcional">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm text-gray-900 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
              placeholder="Ej: +54 11 1234 5678"
              maxLength={40}
            />
          </Field>

          {/* Rol (readonly) */}
          <Field label="Rol" hint="Asignado por el administrador">
            <span className="inline-block text-[10px] font-medium uppercase tracking-wide text-[#1b38e8] bg-[#eff3ff] px-2 py-0.5 rounded">
              {ROLE_LABELS[role]}
            </span>
          </Field>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onSaveProfile}
            disabled={!profileDirty || savingProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingProfile ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </section>

      {/* ===== Sección Seguridad ===== */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Seguridad</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Administrá el acceso a tu cuenta.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {!showPasswordForm ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Contraseña
                  </p>
                  <p className="text-xs text-gray-500">
                    Cambiala periódicamente para mantener tu cuenta segura
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="text-sm font-medium text-[#1b38e8] hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Cambiar contraseña
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    resetPasswordForm()
                    setShowPasswordForm(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <PasswordField
                label="Contraseña actual"
                value={currentPwd}
                onChange={setCurrentPwd}
                error={pwdErrors.current_password}
                autoFocus
              />
              <PasswordField
                label="Nueva contraseña"
                value={newPwd}
                onChange={setNewPwd}
                error={pwdErrors.new_password}
                hint="Mínimo 8 caracteres"
              />
              <PasswordField
                label="Confirmar nueva contraseña"
                value={confirmPwd}
                onChange={setConfirmPwd}
                error={pwdErrors.confirm_password}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetPasswordForm()
                    setShowPasswordForm(false)
                  }}
                  disabled={changingPwd}
                  className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onChangePassword}
                  disabled={
                    changingPwd || !currentPwd || !newPwd || !confirmPwd
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changingPwd ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar contraseña"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ============================================================
// Componentes internos
// ============================================================

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </label>
        {hint && !error && (
          <span className="text-[10px] text-gray-400">{hint}</span>
        )}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoFocus?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className={`w-full text-sm text-gray-900 bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      />
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
