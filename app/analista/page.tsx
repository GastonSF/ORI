import { createClient } from "@/lib/supabase/server"
import { APPLICATION_STATUS_LABELS, CLIENT_TYPE_LABELS } from "@/lib/constants/roles"

export default async function AnalystQueue() {
  const supabase = await createClient()

  // RLS filtra a solo legajos en análisis o posteriores
  const { data: apps } = await supabase
    .from("applications")
    .select(`
      id,
      application_number,
      status,
      requested_amount,
      sent_to_analyst_at,
      client:clients!inner ( legal_name, cuit, client_type )
    `)
    .in("status", ["in_risk_analysis", "observed"])
    .order("sent_to_analyst_at", { ascending: true, nullsFirst: false })
    .limit(50)

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Cola de análisis</h1>
        <p className="mt-1 text-sm text-gray-600">
          Legajos enviados por oficiales para tu dictamen.
        </p>
      </header>

      {!apps || apps.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">
          No hay legajos esperando análisis.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Legajo</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apps.map((a) => {
                const client = Array.isArray(a.client) ? a.client[0] : a.client
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {a.application_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {client?.legal_name ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500">{client?.cuit}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {client?.client_type
                        ? CLIENT_TYPE_LABELS[client.client_type as keyof typeof CLIENT_TYPE_LABELS]
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-xs font-medium">
                        {APPLICATION_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {a.requested_amount
                        ? new Intl.NumberFormat("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            maximumFractionDigits: 0,
                          }).format(Number(a.requested_amount))
                        : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
