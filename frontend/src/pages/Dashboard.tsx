import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity, AlertTriangle, ArrowRight, BriefcaseBusiness, RefreshCw,
  ShieldCheck, Wallet, TrendingUp, Users,
} from "lucide-react"
import { apiRequest } from "@/lib/api"

type Transaction = { id: string; amount: number; currency: string; timestamp: string; label: number | null }
type Page<T> = { items: T[]; total: number; page: number; total_pages: number }
type Alert = { id: string; risk_score: number; status: string; created_at: string; explanation?: string }

const demoTransactions: Transaction[] = [
  { id: "NG-DEMO-10482", amount: 248500, currency: "INR", timestamp: "2026-11-05T10:25:00Z", label: 1 },
  { id: "NG-DEMO-10481", amount: 12500, currency: "INR", timestamp: "2026-11-05T10:18:00Z", label: 0 },
  { id: "NG-DEMO-10480", amount: 98500, currency: "INR", timestamp: "2026-11-05T10:05:00Z", label: 1 },
  { id: "NG-DEMO-10479", amount: 3200, currency: "INR", timestamp: "2026-11-05T09:52:00Z", label: 0 },
  { id: "NG-DEMO-10478", amount: 175000, currency: "INR", timestamp: "2026-11-05T09:40:00Z", label: 1 },
]
const demoAlerts: Alert[] = [
  { id: "NG-ALT-2081", risk_score: 97, status: "open", created_at: "2026-11-05T10:25:00Z", explanation: "Unusual high-value transfer followed by rapid movement of funds" },
  { id: "NG-ALT-2080", risk_score: 91, status: "open", created_at: "2026-11-05T10:05:00Z", explanation: "Multiple transfers to newly observed beneficiary accounts" },
  { id: "NG-ALT-2079", risk_score: 84, status: "investigating", created_at: "2026-11-05T09:40:00Z", explanation: "Transaction velocity is outside the account's normal pattern" },
  { id: "NG-ALT-2078", risk_score: 76, status: "open", created_at: "2026-11-05T09:12:00Z", explanation: "Potential structuring pattern across linked transactions" },
]
const weeklyVolume = [
  { day: "Mon", value: 48 }, { day: "Tue", value: 65 }, { day: "Wed", value: 56 },
  { day: "Thu", value: 82 }, { day: "Fri", value: 72 }, { day: "Sat", value: 91 }, { day: "Sun", value: 68 },
]

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [alertTotal, setAlertTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [hasLiveData, setHasLiveData] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [tx, al] = await Promise.all([
        apiRequest<Page<Transaction>>("/api/v1/transactions?page=1&page_size=100"),
        apiRequest<Page<Alert>>("/api/v1/alerts?page=1&page_size=100"),
      ])
      const live = tx.total > 0 || al.total > 0
      setHasLiveData(live)
      setTransactions(tx.items)
      setTxTotal(tx.total)
      setAlerts(al.items)
      setAlertTotal(al.total)
    } catch (e) {
      setHasLiveData(false)
      setError(e instanceof Error ? e.message : "Could not load live API data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const demoMode = !loading && !hasLiveData
  const shownTransactions = hasLiveData ? transactions : demoTransactions
  const shownAlerts = hasLiveData ? alerts : demoAlerts
  const transactionCount = hasLiveData ? txTotal : 12480
  const alertCount = hasLiveData ? alertTotal : 186
  const highRiskCount = hasLiveData ? alerts.filter(a => a.risk_score >= 85).length : 24
  const openCount = hasLiveData ? alerts.filter(a => a.status === "open").length : 142
  const flagged = shownTransactions.filter(t => t.label === 1).length
  const metric = (Icon: typeof Wallet, label: string, value: string, detail: string) => (
    <div className="metric-card">
      <div className="metric-icon blue"><Icon size={17} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  )

  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> {hasLiveData ? "LIVE API DATA" : "NEXGUARD OVERVIEW"}</div>
          <h1>Command center</h1>
          <p>Fraud monitoring overview, transaction activity and investigation signals.</p>
        </div>
        <button className="secondary-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> Refresh data
        </button>
      </div>

      {demoMode && (
        <div style={{ padding: "12px 14px", background: "#fff4df", border: "1px solid #f0d6a6", borderRadius: 9, color: "#79551d", fontSize: 12, marginBottom: 16 }}>
          <strong>DEMO MODE · SYNTHETIC DATA</strong> — These example KPIs, charts and alerts are for presentation only. They are not live bank records and do not represent real fraud detections. Import data and run detection to switch this dashboard to live API results.
        </div>
      )}
      {error && <div style={{ padding: 12, background: "#f0dfe1", borderRadius: 8, color: "#754c55", fontSize: 12, marginBottom: 14 }}>Live API unavailable: {error}. Showing clearly labelled demo data instead.</div>}

      <div className="metric-grid">
        {metric(Wallet, "Transactions monitored", loading ? "—" : transactionCount.toLocaleString(), hasLiveData ? "Stored transaction records" : "Illustrative demo volume")}
        {metric(AlertTriangle, "Fraud alerts", loading ? "—" : alertCount.toLocaleString(), hasLiveData ? "Alerts returned by API" : "Illustrative demo alerts")}
        {metric(ShieldCheck, "High-risk alerts", loading ? "—" : highRiskCount.toLocaleString(), "Risk score ≥ 85")}
        {metric(BriefcaseBusiness, "Open investigations", loading ? "—" : openCount.toLocaleString(), "Awaiting analyst review")}
      </div>

      <div className="main-grid" style={{ marginTop: 18 }}>
        <section className="panel">
          <div className="panel-header"><div><h2>Transaction activity</h2><p>Weekly monitored transaction volume</p></div><TrendingUp size={17} /></div>
          <div style={{ display: "flex", alignItems: "end", gap: 12, height: 170, padding: "16px 8px 4px" }}>
            {weeklyVolume.map(item => (
              <div key={item.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "end" }}>
                <div title={`${item.value}% relative activity`} style={{ width: "100%", maxWidth: 34, height: `${item.value}%`, minHeight: 8, background: "#3c91a8", borderRadius: "5px 5px 2px 2px", opacity: 0.9 }} />
                <span style={{ fontSize: 10, color: "#78909c" }}>{item.day}</span>
              </div>
            ))}
          </div>
          <div className="health-item"><strong>Transactions in current view</strong><b>{loading ? "—" : transactionCount.toLocaleString()}</b></div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Risk distribution</h2><p>Alert severity overview</p></div><Activity size={17} /></div>
          {[
            { label: "Critical", count: hasLiveData ? alerts.filter(a => a.risk_score >= 85).length : 24, width: 28, color: "#b94b52" },
            { label: "High", count: hasLiveData ? alerts.filter(a => a.risk_score >= 65 && a.risk_score < 85).length : 62, width: 54, color: "#d18a43" },
            { label: "Medium", count: hasLiveData ? alerts.filter(a => a.risk_score >= 40 && a.risk_score < 65).length : 48, width: 42, color: "#d2b45b" },
            { label: "Low", count: hasLiveData ? alerts.filter(a => a.risk_score < 40).length : 52, width: 46, color: "#4d9b85" },
          ].map(item => (
            <div key={item.label} style={{ margin: "18px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}><span>{item.label}</span><strong>{item.count}</strong></div>
              <div style={{ height: 7, background: "#e8eef0", borderRadius: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${hasLiveData ? Math.min(100, item.count / Math.max(1, alertTotal) * 100) : item.width}%`, background: item.color, borderRadius: 8 }} /></div>
            </div>
          ))}
        </section>
      </div>

      <div className="main-grid" style={{ marginTop: 18 }}>
        <section className="panel">
          <div className="panel-header"><div><h2>Recent fraud alerts</h2><p>{demoMode ? "Sample investigation signals" : "Latest alert records from the API"}</p></div><Link to="/alerts" className="text-button">View alerts <ArrowRight size={13} /></Link></div>
          <div className="case-list">
            {shownAlerts.slice(0, 4).map(a => (
              <div className="case-item" key={a.id}>
                <div className="case-symbol"><AlertTriangle size={16} /></div>
                <div className="case-copy"><strong>{a.id}</strong><span>{a.explanation ?? new Date(a.created_at).toLocaleString()}</span></div>
                <b>{Math.round(a.risk_score)}/100</b>
              </div>
            ))}
            {!loading && shownAlerts.length === 0 && <div className="empty-state"><p>No alerts returned by the API.</p><span>Import transactions and run a detection scan.</span></div>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Monitoring snapshot</h2><p>Operational overview</p></div><Users size={17} /></div>
          <div className="health-list">
            <div className="health-item"><strong>Transactions in sample</strong><b>{loading ? "—" : shownTransactions.length}</b></div>
            <div className="health-item"><strong>Flagged sample transactions</strong><b>{loading ? "—" : flagged}</b></div>
            <div className="health-item"><strong>Alerts displayed</strong><b>{loading ? "—" : shownAlerts.length}</b></div>
          </div>
          <div className="heading-actions" style={{ marginTop: 18 }}>
            <Link to="/transactions" className="primary-button">Transaction monitoring <ArrowRight size={13} /></Link>
            <Link to="/ai-detection" className="secondary-button">Detection tools</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
