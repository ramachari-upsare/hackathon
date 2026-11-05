import { useCallback, useEffect, useRef, useState } from "react"
import { Activity, FileUp, Loader2, RefreshCw, Search } from "lucide-react"
import { API_BASE_URL, apiRequest } from "@/lib/api"

type Transaction = { id:string; from_account:string; to_account:string; amount:number; currency:string; timestamp:string; channel:string; label:number|null }
type Page = { items:Transaction[]; total:number; page:number; total_pages:number }
export default function Transactions() {
 const [items,setItems]=useState<Transaction[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[query,setQuery]=useState("")
 const load=useCallback(async()=>{setLoading(true);setError("");try{const data=await apiRequest<Page>("/api/v1/transactions?page=1&page_size=100");setItems(data.items);setTotal(data.total)}catch(e){setError(e instanceof Error?e.message:"Could not load transactions")}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 const fileInput=useRef<HTMLInputElement>(null)
 async function upload(file?:File){if(!file)return;setBusy(true);setNotice("");setError("");try{
  if(!file.name.toLowerCase().endsWith(".csv"))throw new Error("Please choose a .csv file.")
  const form=new FormData();form.append("file",file)
  const response=await fetch(`${API_BASE_URL}/api/v1/transactions/ingest`,{method:"POST",body:form,headers:{Accept:"application/json"}})
  const body=await response.json().catch(()=>null) as {accepted?:number;filename?:string;error?:{message?:string;details?:{missing_accounts?:string[];missing?:string[];errors?:Array<{row?:number;field?:string|null;message?:string}>}}}|null
  if(!response.ok){
   const details=body?.error?.details;const lines=[body?.error?.message||`CSV import failed (HTTP ${response.status})`]
   if(details?.missing_accounts?.length){lines.push(`Unknown account IDs: ${details.missing_accounts.slice(0,5).join(", ")}`);lines.push("Seed customer/account master data before uploading transactions.")}
   if(details?.missing?.length)lines.push(`Missing columns: ${details.missing.join(", ")}`)
   if(details?.errors?.length)lines.push(...details.errors.slice(0,8).map(x=>`Line ${x.row??"?"}${x.field?` · ${x.field}`:""}: ${x.message??"Invalid value"}`))
   setError(lines.join("\\n"));return
  }
  if(typeof body?.accepted!=="number")throw new Error("Unexpected upload response from the API.")
  setNotice(`Imported ${body.accepted} transactions from ${body.filename??file.name}`);await load()
 }catch(e){setError(e instanceof Error?e.message:"CSV import failed")}finally{setBusy(false);if(fileInput.current)fileInput.current.value=""}}
 async function scan(){setBusy(true);setError("");setNotice("");try{const result=await apiRequest<{scanned:number;alerts_created:number;alerts_required:number}>("/api/v1/detection/scan",{method:"POST",body:JSON.stringify({limit:500})});setNotice(`Scanned ${result.scanned} transactions · ${result.alerts_created} new alerts created · ${result.alerts_required} signals met the alert threshold`)}catch(e){setError(e instanceof Error?e.message:"Detection scan failed")}finally{setBusy(false)}}
 const filtered=items.filter(t=>(t.id+t.from_account+t.to_account).toLowerCase().includes(query.toLowerCase()))
 const money=(n:number,c:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency:c||"USD",maximumFractionDigits:2}).format(n)
 return <div className="workspace"><div className="page-heading"><div><div className="eyebrow">FINANCIAL DATA · E03</div><h1>Transaction monitoring</h1><p>Import, validate, search and inspect your authorized transaction records.</p></div><div className="heading-actions"><label className="secondary-button" style={{cursor:"pointer"}}><FileUp size={14}/> Import CSV<input ref={fileInput} type="file" accept=".csv,text/csv" hidden disabled={busy} onChange={e=>void upload(e.target.files?.[0])}/></label><button className="primary-button" disabled={busy} onClick={()=>void scan()}>{busy?<Loader2 size={14} className="animate-spin"/>:<Activity size={14}/>} Run detection</button></div></div>
 <div style={{padding:12,background:"#edf5f8",border:"1px solid #c7d9e1",borderRadius:8,fontSize:11,color:"#516b79",marginBottom:14}}>Import an authorized CSV. Account IDs must already exist in the configured account master. For isolated test fixtures, see <a href="https://github.com/ramachari-upsare/hackathon/tree/nexguard-submission/test/fixtures" target="_blank" rel="noreferrer" style={{textDecoration:"underline"}}>test/fixtures</a>. Test CSVs are synthetic and are not production data.</div>
 {notice&&<div style={{padding:12,background:"#d9eee8",borderRadius:8,color:"#35685d",fontSize:12,marginBottom:12}}>{notice}</div>}{error&&<div style={{padding:12,background:"#f0dfe1",borderRadius:8,color:"#754c55",fontSize:12,marginBottom:12}}>{error}</div>}
 <section className="panel"><div className="panel-header"><div><h2>Transactions <span style={{color:"#7fa6b8"}}>({total.toLocaleString()})</span></h2><p>Latest records from the API</p></div><button className="secondary-button" onClick={()=>void load()}><RefreshCw size={13}/> Refresh</button></div>
 <div className="table-toolbar"><label className="table-search"><Search size={13}/><input placeholder="Search transaction or account ID" value={query} onChange={e=>setQuery(e.target.value)}/></label><span style={{fontSize:10,color:"#66808e"}}>{filtered.length} shown</span></div>
 <div className="data-table-wrap"><table><thead><tr><th>Transaction</th><th>From account</th><th>To account</th><th>Amount</th><th>Channel</th><th>Timestamp</th><th>Label</th></tr></thead><tbody>{loading?<tr><td colSpan={7}>Loading transactions…</td></tr>:filtered.length===0?<tr><td colSpan={7}>{total===0?"No records yet. Import the sample CSV to begin.":"No transactions match your search."}</td></tr>:filtered.map(t=><tr key={t.id}><td><strong>{t.id.slice(0,12)}…</strong></td><td>{t.from_account.slice(0,12)}…</td><td>{t.to_account.slice(0,12)}…</td><td className="amount-cell">{money(t.amount,t.currency)}</td><td>{t.channel}</td><td>{new Date(t.timestamp).toLocaleString()}</td><td><span className={`score ${t.label===1?"critical":"medium"}`}>{t.label===1?"Known fraud":t.label===0?"Legitimate":"Unlabelled"}</span></td></tr>)}</tbody></table></div></section></div>
}
