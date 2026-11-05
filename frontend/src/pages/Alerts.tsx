import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Search, ShieldAlert } from "lucide-react"
import { apiRequest } from "@/lib/api"

type Alert = { id: string; transaction_id: string; risk_score: number; risk_level: string; explanation: string; status: string; created_at: string }
type Page = { items: Alert[]; total: number; page: number; total_pages: number }

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

// Clearly synthetic examples used only when the API has no records or is unavailable.
const demoAlerts: Alert[] = [
  { id: "DEMO-ALT-001", transaction_id: "DEMO-TXN-10482", risk_score: 97, risk_level: "critical", explanation: "Unusually large transfer followed by rapid movement across multiple accounts.", status: "open", created_at: minutesAgo(8) },
  { id: "DEMO-ALT-002", transaction_id: "DEMO-TXN-10476", risk_score: 91, risk_level: "critical", explanation: "High-value transaction from a newly observed device and location.", status: "open", created_at: minutesAgo(24) },
  { id: "DEMO-ALT-003", transaction_id: "DEMO-TXN-10451", risk_score: 84, risk_level: "high", explanation: "Transaction velocity is significantly above the account's normal pattern.", status: "investigating", created_at: minutesAgo(51) },
  { id: "DEMO-ALT-004", transaction_id: "DEMO-TXN-10433", risk_score: 78, risk_level: "high", explanation: "Multiple transfers just below a configured monitoring threshold.", status: "open", created_at: minutesAgo(93) },
  { id: "DEMO-ALT-005", transaction_id: "DEMO-TXN-10418", risk_score: 69, risk_level: "high", explanation: "Counterparty has limited history and is linked to a flagged account cluster.", status: "open", created_at: minutesAgo(147) },
  { id: "DEMO-ALT-006", transaction_id: "DEMO-TXN-10397", risk_score: 58, risk_level: "medium", explanation: "Unusual transaction timing compared with the account's historical activity.", status: "review", created_at: minutesAgo(226) },
]

export default function Alerts() {
  const [items, setItems] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [demoMode, setDemoMode] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await apiRequest<Page>("/api/v1/alerts?page=1&page_size=100")
      if (data.total > 0 && data.items.length > 0) {
        setItems(data.items)
        setTotal(data.total)
        setDemoMode(false)
      } else {
        setItems(demoAlerts)
        setTotal(186)
        setDemoMode(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load alerts")
      setItems(demoAlerts)
      setTotal(186)
      setDemoMode(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const shown = items.filter(alert =>
    (alert.id + alert.transaction_id + alert.explanation + alert.risk_level + alert.status)
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const highRiskCount = demoMode ? 24 : items.filter(alert => alert.risk_score >= 65).length
  const openCount = demoMode ? 142 : items.filter(alert => alert.status === "open").length

  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">FRAUD INTELLIGENCE · E04</div>
          <h1>Fraud alerts</h1>
          <p>Prioritized detection signals with evidence and human-review context.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => void load()}><RefreshCw size={14} /> Refresh alerts</button>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-label">Total alerts</div><div className="metric-value">{total}</div><div className="metric-detail">{demoMode ? "Illustrative demo volume" : "API records"}</div></div>
        <div className="metric-card"><div className="metric-label">Critical / high</div><div className="metric-value">{highRiskCount}</div><div className="metric-detail">Risk score ≥ 65</div></div>
        <div className="metric-card"><div className="metric-label">Open</div><div className="metric-value">{openCount}</div><div className="metric-detail">Awaiting review</div></div>
        <div className="metric-card"><div className="metric-label">Human review</div><div className="metric-value">Required</div><div className="metric-detail">Signals are not verdicts</div></div>
      </div>

      {demoMode && (
        <div style={{ padding: 13, background: "#fff4df", border: "1px solid #ead5a9", borderRadius: 8, color: "#76551f", marginBottom: 12, fontSize: 12 }}>
          <strong>DEMO MODE · SYNTHETIC ALERTS</strong>
          <div style={{ marginTop: 4 }}>These example alerts and summary figures are illustrative only. They are not live bank records or real fraud detections. Import transactions and run detection to view actual API alerts.</div>
        </div>
      )}
      {error && <div style={{ padding: 12, background: "#f0dfe1", borderRadius: 8, color: "#754c55", marginBottom: 12, fontSize: 12 }}>API unavailable: {error}. Showing clearly labelled demo examples instead.</div>}

      <section className="panel">
        <div className="panel-header">
          <div><h2>Detection queue</h2><p>Alerts generated by rule-based and anomaly scoring</p></div>
          <span className="health-check"><ShieldAlert size={13} /> Human review</span>
        </div>
        <div className="table-toolbar">
          <label className="table-search"><Search size={13} /><input placeholder="Search alert evidence..." value={query} onChange={event => setQuery(event.target.value)} /></label>
        </div>
        <div className="data-table-wrap">
          <table>
            <thead><tr><th>Alert ID</th><th>Transaction</th><th>Risk score</th><th>Risk level</th><th>Status</th><th>Created</th><th>Explanation</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}>Loading alerts…</td></tr> : shown.length === 0 ? <tr><td colSpan={7}>{query ? "No alerts match your search." : "No alerts yet. Import transactions and run detection from Transaction Monitoring."}</td></tr> : shown.map(alert => (
                <tr key={alert.id}>
                  <td><strong>{alert.id.slice(0, 12)}{alert.id.length > 12 ? "…" : ""}</strong></td>
                  <td>{alert.transaction_id.slice(0, 12)}{alert.transaction_id.length > 12 ? "…" : ""}</td>
                  <td><span className={`score ${alert.risk_score >= 85 ? "critical" : alert.risk_score >= 65 ? "high" : "medium"}`}>{alert.risk_score.toFixed(0)}/100</span></td>
                  <td>{alert.risk_level}</td>
                  <td>{alert.status}</td>
                  <td>{new Date(alert.created_at).toLocaleString()}</td>
                  <td style={{ whiteSpace: "normal", minWidth: 240 }}>{alert.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
