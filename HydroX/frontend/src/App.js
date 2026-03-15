import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Outfit', sans-serif;
    background: #040810;
    color: #e8eef8;
    min-height: 100vh;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #040810; }
  ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 10px; }
  ::selection { background: rgba(0,195,255,0.25); }

  @keyframes floatY   { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-12px)} }
  @keyframes spinSlow { from{transform:rotate(0)}           to{transform:rotate(360deg)} }
  @keyframes ripple   { 0%{transform:scale(0.8);opacity:1}  100%{transform:scale(2.5);opacity:0} }
  @keyframes slideIn  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0}                     to{opacity:1} }
  @keyframes pulse2   { 0%,100%{opacity:1}                  50%{opacity:0.35} }
  @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes waveBar  { 0%,100%{transform:scaleY(0.4)}      50%{transform:scaleY(1)} }
  @keyframes countUp  { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(0,195,255,0.2)} 50%{box-shadow:0 0 40px rgba(0,195,255,0.5)} }
  @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
  @keyframes drip { 0%{transform:translateY(0) scaleY(1); opacity:1} 100%{transform:translateY(30px) scaleY(0); opacity:0} }

  .nav-link { transition: color 0.2s, background 0.2s; }
  .nav-link:hover { color: #00c3ff !important; }
  .btn-glow:hover { animation: glow 1s ease infinite; }
  .card-hover { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s; }
  .card-hover:hover { transform: translateY(-6px); }

  .water-wave {
    position: relative;
    overflow: hidden;
  }
  .water-wave::after {
    content: '';
    position: absolute;
    bottom: 0; left: -50%;
    width: 200%; height: 60%;
    background: rgba(0,195,255,0.07);
    border-radius: 40%;
    animation: spinSlow 8s linear infinite;
    transform-origin: center bottom;
  }
`;

// ═══════════════════════════════════════════════════════════════════
// DATA & API
// ═══════════════════════════════════════════════════════════════════
// Static flat metadata - no usage/bill data here, that comes from backend
const FLAT_METADATA = [
  { key:"f1", id:"A101", resident:"Rajesh Kumar",    phone:"919980171930", threshold:3000, floor:1, block:"A" },
  { key:"f2", id:"A102", resident:"Priya Sharma",    phone:"919980171930", threshold:3000, floor:1, block:"A" },
  { key:"f3", id:"A103", resident:"Arun Mehta",      phone:"919988776655", threshold:3000, floor:1, block:"A" },
  { key:"f4", id:"B201", resident:"Sneha Nair",      phone:"919765432100", threshold:3000, floor:2, block:"B" },
];

const API_BASE = "http://localhost:3000/api";
const MONTH = "February 2025";
const BILLING_RATE = 1500; // ₹ per 1000L
const RATE = BILLING_RATE / 1000; // ₹ per litre

// Demo users (no real auth yet)
const USERS = {
  admin: { role:"admin", name:"Admin Manager",  flatId:null,   password:"admin123" },
  A101:  { role:"user",  name:"Rajesh Kumar",   flatId:"A101", password:"raj123"   },
  A102:  { role:"user",  name:"Priya Sharma",   flatId:"A102", password:"pri123"   },
  B201:  { role:"user",  name:"Sneha Nair",     flatId:"B201", password:"sne123"   },
};

// Fetch helper with error handling
async function fetchFromAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return null;
  }
}

// Combine backend data with metadata
function mergeFlatsWithData(metadata, historyData, billingData, alertData) {
  const alertList = Array.isArray(alertData)
    ? alertData
    : alertData && typeof alertData === "object"
      ? Object.values(alertData)
      : [];

  const leakSet = new Set(alertList.map(a => a.flat));

  return metadata.map(meta => {
    const usage = historyData?.[meta.key] || 0;
    const bill  = billingData?.[meta.key] || 0;

    return {
      ...meta,
      usage,
      bill,
      leaked: leakSet.has(meta.key),
    };
  });
}


// WhatsApp message builders
function billMsg(flat) {
  return `Hi ${flat.resident}! *HydroX Smart Water - ${MONTH}*\n\n` +
    ` Flat: ${flat.id}\n Usage: ${flat.usage.toLocaleString()} L\n` +
    ` Bill: ₹${flat.bill}\n\n` +
    `Pay via UPI: *hydroX@upi*\n Due: 5th March 2025\n\nThank you!`;
}

function leakMsg(flat) {
  return ` *LEAKAGE ALERT* - Flat ${flat.id}\n\nDear ${flat.resident},\n` +
    `Water leakage detected by IoT sensors.\n` +
    ` Severity: HIGH\n Detected: ${new Date().toLocaleString()}\n` +
    ` Contact maintenance: +91 99999 00001\n\n- HydroX System`;
}

function overMsg(flat) {
  return ` *HIGH USAGE ALERT* - Flat ${flat.id}\n\nDear ${flat.resident},\n` +
    `Your usage (${flat.usage.toLocaleString()} L) exceeds threshold (${flat.threshold.toLocaleString()} L).\n` +
    ` Bill: ₹${flat.bill}\n\nPlease check for open taps.\n\n- HydroX System`;
}

function waLink(phone, msg) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// ═══════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════
function useAnimate(delay=0) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.cssText += `opacity:0;transform:translateY(30px)`;
    const t = setTimeout(() => {
      el.style.transition = `opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.2,0.64,1)`;
      el.style.opacity = "1"; el.style.transform = "translateY(0)";
    }, delay * 1000 + 50);
    return () => clearTimeout(t);
  }, [delay]);
  return ref;
}

function useCountUp(target, dur=1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s=null;
    const step = ts => {
      if (!s) s=ts;
      const p = Math.min((ts-s)/dur, 1);
      const e = 1-Math.pow(1-p,4);
      setV(Math.floor(e*target));
      if (p<1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, dur]);
  return v;
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type="success") => {
    const id = Date.now();
    setToasts(p => [...p, {id,msg,type}]);
    setTimeout(() => setToasts(p => p.filter(t=>t.id!==id)), 3800);
  },[]);
  return [toasts, add];
}

// ═══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const C = {
  bg:    "#040810",
  card:  "rgba(255,255,255,0.03)",
  border:"rgba(255,255,255,0.07)",
  cyan:  "#00c3ff",
  teal:  "#00e5c3",
  red:   "#ff4060",
  amber: "#ffab00",
  purple:"#9b6dff",
  green: "#25d366",
  text:  "#e8eef8",
  muted: "rgba(232,238,248,0.45)",
};

function Badge({children, color=C.cyan, style={}}) {
  return <span style={{
    display:"inline-flex", alignItems:"center", gap:5,
    background:`${color}18`, border:`1px solid ${color}40`,
    color, borderRadius:20, padding:"3px 12px",
    fontSize:11, fontWeight:700, letterSpacing:"0.08em",
    textTransform:"uppercase", ...style,
  }}>{children}</span>;
}

function Btn({children, onClick, color=C.cyan, outline=false, size="md", icon, style={}, disabled=false}) {
  const sz = size==="sm" ? {padding:"7px 16px",fontSize:12} : size==="lg" ? {padding:"14px 32px",fontSize:15} : {padding:"10px 22px",fontSize:13};
  return <button onClick={onClick} disabled={disabled} style={{
    ...sz, borderRadius:12,
    background: outline ? `${color}12` : `linear-gradient(135deg, ${color}, ${color}bb)`,
    border: `1px solid ${color}${outline?"50":"00"}`,
    color: outline ? color : "#fff",
    fontWeight:700, cursor:disabled?"not-allowed":"pointer",
    display:"flex", alignItems:"center", gap:7, fontFamily:"'Outfit',sans-serif",
    boxShadow: outline ? "none" : `0 4px 20px ${color}30`,
    transition:"all 0.2s", opacity: disabled?0.5:1, ...style,
  }}
  onMouseEnter={e=>!disabled&&(e.currentTarget.style.transform="scale(1.04)")}
  onMouseLeave={e=>!disabled&&(e.currentTarget.style.transform="scale(1)")}
  >{icon&&<span>{icon}</span>}{children}</button>;
}

function Card({children, style={}, glow=null, onClick}) {
  return <div onClick={onClick} style={{
    background:"linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
    border:`1px solid ${C.border}`,
    borderRadius:20, padding:24,
    backdropFilter:"blur(12px)",
    position:"relative", overflow:"hidden",
    ...(glow ? {boxShadow:`0 0 40px ${glow}18`, borderColor:`${glow}25`} : {}),
    ...(onClick ? {cursor:"pointer"} : {}),
    ...style,
  }}>{children}</div>;
}

function Ring({pct, color, size=72, thickness=7}) {
  const r=(size-thickness)/2, circ=2*Math.PI*r;
  const [d,setD]=useState(0);
  useEffect(()=>{setTimeout(()=>setD(circ*Math.min(pct,1)),300);},[pct,circ]);
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)", flexShrink:0}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
      strokeDasharray={circ} strokeDashoffset={circ-d} strokeLinecap="round"
      style={{transition:"stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)"}}/>
  </svg>;
}

function WaveLoader() {
  return <div style={{display:"flex",gap:4,alignItems:"center",height:24}}>
    {[0,0.15,0.3,0.45,0.6].map((d,i)=>(
      <div key={i} style={{width:4,height:20,background:C.cyan,borderRadius:2,
        animation:`waveBar 0.9s ease ${d}s infinite`}}/>
    ))}
  </div>;
}

function Toasts({toasts}) {
  const colors={success:C.teal,error:C.red,info:C.cyan,warning:C.amber};
  return <div style={{position:"fixed",bottom:28,right:28,zIndex:9999,display:"flex",flexDirection:"column",gap:10}}>
    {toasts.map(t=>(
      <div key={t.id} style={{
        background:"rgba(4,8,16,0.97)", border:`1px solid ${colors[t.type]||C.cyan}40`,
        borderLeft:`3px solid ${colors[t.type]||C.cyan}`,
        borderRadius:14, padding:"14px 20px", minWidth:280, maxWidth:340,
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        animation:"slideIn 0.35s ease",
        fontSize:14, fontWeight:500, color:C.text,
      }}>{t.msg}</div>
    ))}
  </div>;
}

function NavBar({page, setPage, user, onLogout}) {
  const links = user?.role==="admin"
    ? [{id:"home",label:"Home"},{id:"admin",label:"Dashboard"},{id:"leakage",label:"Leakage"}]
    : [{id:"home",label:"Home"},{id:"user",label:"My Flat"}];

  return <nav style={{
    position:"fixed",top:0,left:0,right:0,zIndex:500,
    background:"rgba(4,8,16,0.9)",
    backdropFilter:"blur(20px)",
    borderBottom:`1px solid ${C.border}`,
    padding:"0 32px",
    display:"flex",alignItems:"center",justifyContent:"space-between",height:62,
  }}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{
        width:36,height:36,borderRadius:10,
        background:"linear-gradient(135deg,#00c3ff,#00e5c3)",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
        boxShadow:"0 0 20px rgba(0,195,255,0.4)",
      }}></div>
      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,
        background:"linear-gradient(90deg,#00c3ff,#00e5c3)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>HydroX</span>
    
    </div>

    <div style={{display:"flex",gap:4}}>
      {links.map(l=>(
        <button key={l.id} onClick={()=>setPage(l.id)} style={{
          padding:"7px 18px",borderRadius:10,border:"none",cursor:"pointer",
          background: page===l.id ? `rgba(0,195,255,0.15)` : "transparent",
          color: page===l.id ? C.cyan : C.muted,
          fontWeight: page===l.id ? 700 : 500, fontSize:13,
          fontFamily:"'Outfit',sans-serif",
          transition:"all 0.2s",
          borderBottom: page===l.id ? `2px solid ${C.cyan}` : "2px solid transparent",
        }}>{l.icon} {l.label}</button>
      ))}
    </div>

    <div style={{display:"flex",alignItems:"center",gap:12}}>
      {user ? <>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>{user.name}</div>
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{user.role}</div>
        </div>
        <button onClick={onLogout} style={{
          padding:"7px 16px",borderRadius:10,fontSize:12,fontWeight:600,
          background:"rgba(255,64,96,0.12)",border:"1px solid rgba(255,64,96,0.3)",
          color:C.red,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
        }}>Sign Out</button>
      </> : <Btn size="sm" onClick={()=>setPage("login")} >Login</Btn>}
    </div>
  </nav>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: HOME / LANDING
// ═══════════════════════════════════════════════════════════════════
function HomePage({setPage}) {
  // All hooks declared first
  const [flats, setFlats] = useState(null);
  const [loading, setLoading] = useState(true);
  const hero  = useAnimate(0.1);
  const sec1  = useAnimate(0.3);
  const sec2  = useAnimate(0.5);

  useEffect(() => {
    async function loadData() {
      const historyData = await fetchFromAPI("/history/month");
const billingData = await fetchFromAPI("/billing");
const alertData   = await fetchFromAPI("/alerts");

      
      if (historyData && billingData && alertData) {
        const merged = mergeFlatsWithData(FLAT_METADATA, historyData, billingData, alertData);
        setFlats(merged);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Calculate values after hooks
  const totalUsage = flats ? flats.reduce((s,f)=>s+f.usage,0) : 0;
  const totalBill  = flats ? flats.reduce((s,f)=>s+f.bill,0) : 0;
  const leakCount  = flats ? flats.filter(f=>f.leaked).length : 0;

  const usageNum = useCountUp(totalUsage, 1600);
  const billNum  = useCountUp(totalBill, 1800);

  return <div style={{paddingTop:62}}>
    {/* Hero */}
    <div style={{
      minHeight:"92vh", display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      position:"relative",overflow:"hidden",textAlign:"center",padding:"60px 24px",
    }}>
      {/* Ambient BG */}
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"10%",left:"15%",width:500,height:500,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(0,195,255,0.08),transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:"10%",right:"10%",width:400,height:400,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(0,229,195,0.06),transparent 70%)"}}/>
        {/* Floating orbs */}
        {[...Array(6)].map((_,i)=>(
          <div key={i} style={{
            position:"absolute",
            left:`${15+i*14}%`,top:`${20+((i*37)%50)}%`,
            width:i%2===0?8:5,height:i%2===0?8:5,borderRadius:"50%",
            background: i%3===0?C.cyan:i%3===1?C.teal:C.purple,
            opacity:0.4,animation:`floatY ${3+i*0.5}s ease-in-out ${i*0.3}s infinite`,
          }}/>
        ))}
        {/* Grid lines */}
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.04}}>
          {[...Array(12)].map((_,i)=><line key={i} x1={`${i*9}%`} y1="0" x2={`${i*9}%`} y2="100%" stroke={C.cyan} strokeWidth="1"/>)}
          {[...Array(8)].map((_,i)=><line key={i} x1="0" y1={`${i*14}%`} x2="100%" y2={`${i*14}%`} stroke={C.cyan} strokeWidth="1"/>)}
        </svg>
      </div>

      <div ref={hero} style={{position:"relative",zIndex:1,maxWidth:800}}>
        <h1 style={{
          fontFamily:"'Syne',sans-serif",fontWeight:800,
          fontSize:"clamp(40px,6vw,80px)",lineHeight:1.05,letterSpacing:"-0.04em",
          marginBottom:24,
        }}>
          <span style={{color:C.text}}>Water Intelligence</span><br/>
          <span style={{
            background:"linear-gradient(135deg,#00c3ff 0%,#00e5c3 50%,#9b6dff 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>System</span>
        </h1>

        <p style={{fontSize:18,color:C.muted,lineHeight:1.7,marginBottom:40,maxWidth:560,margin:"0 auto 40px"}}>
          IoT sensors track per-flat water consumption in real time.
          Pay only for what you use. Leakages detected instantly.
        </p>

        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn size="lg" onClick={()=>setPage("login")}  style={{background:"linear-gradient(135deg,#00c3ff,#00e5c3)"}}>
            Access Dashboard
          </Btn>
          <Btn size="lg" outline onClick={()=>setPage("leakage")}  color={C.red}>
            View Leakages
          </Btn>
        </div>
      </div>

      {/* Scroll cue */}
      <div style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",
        display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:C.muted,fontSize:12}}>
        <div style={{width:1,height:40,background:`linear-gradient(${C.cyan},transparent)`}}/>
        Scroll to explore
      </div>
    </div>

    {/* Live Stats Band */}
    <div ref={sec1} style={{
      background:"linear-gradient(90deg,rgba(0,195,255,0.08),rgba(0,229,195,0.06),rgba(155,109,255,0.06))",
      borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,
      padding:"48px 40px",
    }}>
      <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:32}}>
        {[
          {label:"Total Flats",value:FLAT_METADATA.length,unit:"units",color:C.cyan},
          {label:"Total Usage",value:loading ? "Loading..." : usageNum.toLocaleString(),unit:"Litres",color:C.teal},
          {label:"Monthly Revenue",value:loading ? "Loading..." : `₹${billNum.toLocaleString()}`,unit:"collected",color:C.purple},
          {label:"Active Leakages",value:leakCount,unit:"alerts",color:C.red},
        ].map((s,i)=>(
          <div key={i} style={{textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:8}}>{s.icon}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:36,fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:6}}>{s.label}</div>
            <div style={{fontSize:11,color:`${s.color}80`}}>{s.unit}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Features */}
    <div ref={sec2} style={{maxWidth:1100,margin:"80px auto",padding:"0 40px"}}>
      <div style={{textAlign:"center",marginBottom:52}}>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:38,fontWeight:800,letterSpacing:"-0.03em",marginBottom:12}}>
          How It Works
        </h2>
        <p style={{color:C.muted,fontSize:16}}>End-to-end IoT pipeline from sensor to payment</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
        {[
          {icon:"📡",title:"IoT Detection",desc:"Smart flow sensors installed at each flat measure water usage in real-time, sending data to the cloud every 5 minutes.",color:C.cyan},
          {icon:"🧮",title:"Smart Billing",desc:"Bills are auto-calculated per litre used. Overuse flagged. Fairness guaranteed — pay only for your actual consumption.",color:C.teal},
          {icon:"📱",title:"Instant Alerts",desc:"Leakages, overuse, and monthly bills are sent via WhatsApp automatically. No app needed for residents.",color:C.purple},
          {icon:"🔍",title:"Leak Detection",desc:"IoT sensors detect pressure drops and unusual flow patterns 24/7. Alerts go out within minutes of detection.",color:C.red},
          {icon:"📊",title:"Analytics",desc:"Month-over-month trends, block-wise comparison, and per-flat history available to building management.",color:C.amber},
          {icon:"🔐",title:"Role-Based Access",desc:"Admins see everything. Residents see only their flat. Secure login with role isolation.",color:"#9b6dff"},
        ].map((f,i)=>(
          <Card key={i} glow={f.color} style={{padding:28}} style2={{}}>
            <div style={{
              width:50,height:50,borderRadius:14,marginBottom:18,
              background:`${f.color}15`,border:`1px solid ${f.color}30`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
            }}>{f.icon}</div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>{f.title}</h3>
            <p style={{fontSize:14,color:C.muted,lineHeight:1.6}}>{f.desc}</p>
          </Card>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div style={{
      maxWidth:700,margin:"0 auto 80px",padding:"0 40px",textAlign:"center",
    }}>
      <Card glow={C.cyan} style={{padding:"48px 40px"}}>
        <div style={{fontSize:48,marginBottom:16}}>🌊</div>
        <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,marginBottom:12}}>Ready to get started?</h3>
        <p style={{color:C.muted,marginBottom:28}}>Login as admin to manage all flats or use your flat ID to view your personal usage.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn onClick={()=>setPage("login")} >Admin Login</Btn>
          <Btn outline color={C.teal} onClick={()=>setPage("login")}>Resident Login</Btn>
        </div>
        <p style={{fontSize:12,color:C.muted,marginTop:16}}>
          Admin: <code style={{color:C.cyan}}>admin / admin123</code> &nbsp;|&nbsp;
          Resident: <code style={{color:C.teal}}>A101 / raj123</code>
        </p>
      </Card>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: LOGIN
// ═══════════════════════════════════════════════════════════════════
function LoginPage({onLogin, setPage}) {
  const [id,setId]=useState(""), [pw,setPw]=useState(""), [err,setErr]=useState(""), [loading,setLoading]=useState(false);
  const ref = useAnimate(0.1);

  const handle = () => {
    setLoading(true); setErr("");
    setTimeout(()=>{
      const u = USERS[id];
      if (u && u.password===pw) {
        onLogin({...u, loginId:id});
        setPage(u.role==="admin"?"admin":"user");
      } else { setErr("Invalid credentials. Check username & password."); }
      setLoading(false);
    },800);
  };

  return <div style={{
    minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
    padding:24,paddingTop:80,
    background:"radial-gradient(ellipse at center,rgba(0,195,255,0.06) 0%,transparent 60%)",
  }}>
    <div ref={ref} style={{width:"100%",maxWidth:420}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{
          width:72,height:72,borderRadius:20,margin:"0 auto 16px",
          background:"linear-gradient(135deg,#00c3ff,#00e5c3)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,
          boxShadow:"0 0 40px rgba(0,195,255,0.35)",
        }}></div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,marginBottom:6}}>Welcome Back</h2>
        <p style={{color:C.muted,fontSize:14}}>Sign in to AquaFlux Management</p>
      </div>

      <Card glow={C.cyan}>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>
            Username / Flat ID
          </label>
          <input value={id} onChange={e=>setId(e.target.value)}
            placeholder="e.g. admin or A101"
            onKeyDown={e=>e.key==="Enter"&&handle()}
            style={{
              width:"100%",padding:"12px 16px",borderRadius:12,
              background:"rgba(255,255,255,0.05)",
              border:`1px solid ${err?"rgba(255,64,96,0.5)":C.border}`,
              color:C.text,fontSize:14,fontFamily:"'Outfit',sans-serif",
              outline:"none",transition:"border 0.2s",
            }}
            onFocus={e=>e.target.style.borderColor=C.cyan}
            onBlur={e=>e.target.style.borderColor=err?"rgba(255,64,96,0.5)":C.border}
          />
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>
            Password
          </label>
          <input value={pw} onChange={e=>setPw(e.target.value)} type="password"
            placeholder="Enter password"
            onKeyDown={e=>e.key==="Enter"&&handle()}
            style={{
              width:"100%",padding:"12px 16px",borderRadius:12,
              background:"rgba(255,255,255,0.05)",
              border:`1px solid ${err?"rgba(255,64,96,0.5)":C.border}`,
              color:C.text,fontSize:14,fontFamily:"'Outfit',sans-serif",outline:"none",
            }}
            onFocus={e=>e.target.style.borderColor=C.cyan}
            onBlur={e=>e.target.style.borderColor=err?"rgba(255,64,96,0.5)":C.border}
          />
        </div>

        {err && <div style={{
          background:"rgba(255,64,96,0.1)",border:"1px solid rgba(255,64,96,0.3)",
          borderRadius:10,padding:"10px 14px",marginBottom:16,
          fontSize:13,color:C.red,
        }}> {err}</div>}

        <Btn onClick={handle} disabled={loading} style={{width:"100%",justifyContent:"center"}}
          icon={loading?"":""}>
          {loading?<><WaveLoader/>Signing in...</>:"Sign In →"}
        </Btn>

        <div style={{marginTop:20,padding:"16px",background:"rgba(0,195,255,0.05)",borderRadius:12,border:"1px dashed rgba(0,195,255,0.2)"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Demo Credentials:</div>
          <div style={{fontSize:12,color:C.cyan}}><strong>Admin:</strong> admin / admin123</div>
          <div style={{fontSize:12,color:C.teal}}><strong>Resident:</strong> A101 / raj123 &nbsp; B202 / kir123</div>
        </div>
      </Card>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function AdminPage({setPage}) {
  const [flats, setFlats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("usage");
  const [toasts, addToast] = useToast();
  const h1 = useAnimate(0.05), h2 = useAnimate(0.15), h3 = useAnimate(0.25);

  // Calculate totals BEFORE any conditions (for hook calls)
  const total = flats ? flats.reduce((s, f) => s + f.usage, 0) : 0;
  const revenue = flats ? flats.reduce((s, f) => s + f.bill, 0) : 0;
  
  // Call ALL hooks BEFORE any return statements
  const totalNum = useCountUp(total);
  const revenueNum = useCountUp(revenue);

  useEffect(() => {
    async function loadData() {
      const historyData = await fetchFromAPI("/history/month");
      const billingData = await fetchFromAPI("/billing");
      const alertData = await fetchFromAPI("/alerts");      
      
      if (historyData && billingData && alertData) {
        const merged = mergeFlatsWithData(FLAT_METADATA, historyData, billingData , alertData);
        setFlats(merged);
        setError(null);
      } else {
        setError("Failed to load data from backend");
        setFlats([]);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // NOW we can have early returns after all hooks are called
  if (loading) {
    return <div style={{paddingTop:62, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div><WaveLoader/><p style={{color:C.muted, marginTop:16}}>Loading admin dashboard...</p></div>
    </div>;
  }

  if (error || !flats) {
    return <div style={{paddingTop:62, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <p style={{color:C.red, fontSize:16, marginBottom:12}}>{error || "No data available"}</p>
        <p style={{color:C.muted}}>Ensure backend is running at {API_BASE}</p>
      </div>
    </div>;
  }

  const leaks = flats.filter(f => f.leaked).length;
  const overuse = flats.filter(f => f.usage > f.threshold).length;

  const shown = flats
    .filter(f => filter === "all" || (filter === "leak" && f.leaked) || (filter === "over" && f.usage > f.threshold))
    .filter(f => f.id.toLowerCase().includes(search.toLowerCase()) || f.resident.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "usage" ? b.usage - a.usage : sort === "bill" ? b.bill - a.bill : a.id.localeCompare(b.id));

  const sendBill = (f) => { window.open(waLink(f.phone, billMsg(f)), "_blank"); addToast(` Bill sent to ${f.resident}`, "success"); };
  const sendLeak = (f) => { window.open(waLink(f.phone, leakMsg(f)), "_blank"); addToast(` Alert sent to ${f.resident}`, "error"); };
  const sendOver = (f) => { window.open(waLink(f.phone, overMsg(f)), "_blank"); addToast(` Overuse alert sent`, "warning"); };
  const sendAllBills = () => {
    flats.forEach((f, i) => setTimeout(() => window.open(waLink(f.phone, billMsg(f)), "_blank"), i * 700));
    addToast(` Sending bills to all ${flats.length} flats...`, "info");
  };

  const flatColor = (f) => f.leaked ? C.red : f.usage > f.threshold ? C.amber : C.teal;

  return <div style={{paddingTop:62}}>
    {/* Top bar */}
    <div style={{
      background:"rgba(4,8,16,0.8)",backdropFilter:"blur(16px)",
      borderBottom:`1px solid ${C.border}`,
      padding:"20px 36px",display:"flex",justifyContent:"space-between",alignItems:"center",
    }}>
      <div ref={h1}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,letterSpacing:"-0.02em"}}>
          Admin Dashboard
        </h1>
        <p style={{color:C.muted,fontSize:13}}>All flats · {MONTH} billing cycle</p>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn outline color={C.amber} onClick={()=>setPage("analytics")} size="sm">Analytics</Btn>
        <Btn outline color={C.red} onClick={()=>setPage("leakage")} size="sm">Leakage Monitor</Btn>
        <Btn onClick={sendAllBills} style={{background:"linear-gradient(135deg,#25d366,#128c7e)"}}>Send All Bills</Btn>
      </div>
    </div>

    <div style={{padding:"32px 36px",maxWidth:1400,margin:"0 auto"}}>
      {/* Stats */}
      <div ref={h2} style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,marginBottom:32}}>
        {[
          {label:"Total Flats",val:flats.length,unit:"",color:C.cyan,sub:"Active Units"},
          {label:"Total Usage",val:totalNum.toLocaleString(),unit:"L",color:C.teal,sub:"This month"},
          {label:"Revenue",val:`₹${revenueNum.toLocaleString()}`,unit:"",color:C.purple,sub:"Bills generated"},
          {label:"Issues",val:leaks+overuse,unit:"",color:C.amber,sub:`${leaks} leaks · ${overuse} overuse`},
        ].map((s,i)=>(
          <Card key={i} glow={s.color}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{s.label}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:30,fontWeight:700,color:s.color,lineHeight:1}}>
                  {s.val}<span style={{fontSize:14,color:`${s.color}90`,marginLeft:4}}>{s.unit}</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:6}}>{s.sub}</div>
              </div>
              <div style={{fontSize:28}}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter + Search */}
      <div ref={h3} style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:6}}>
          {[{id:"all",label:"All Flats"},{id:"leak",label:"Leaking"},{id:"over",label:"Overuse"}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:"7px 16px",borderRadius:10,cursor:"pointer",
              background: filter===f.id?`rgba(0,195,255,0.2)`:"rgba(255,255,255,0.04)",
              color: filter===f.id?C.cyan:C.muted,
              fontWeight:filter===f.id?700:400,fontSize:12,
              fontFamily:"'Outfit',sans-serif",
              border: filter===f.id?`1px solid ${C.cyan}40`:"1px solid transparent",
              transition:"all 0.2s",
            }}>{f.label}</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search flat or resident..."
          style={{
            padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.04)",
            border:`1px solid ${C.border}`,color:C.text,fontSize:13,
            fontFamily:"'Outfit',sans-serif",outline:"none",minWidth:240,
          }}/>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:12,color:C.muted}}>Sort:</span>
          {["usage","bill","id"].map(s=>(
            <button key={s} onClick={()=>setSort(s)} style={{
              padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",
              background: sort===s?"rgba(0,195,255,0.2)":"transparent",
              color: sort===s?C.cyan:C.muted,fontSize:11,
              fontFamily:"'Outfit',sans-serif",fontWeight:sort===s?700:400,
            }}>{s.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Flat Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>
        {shown.map((f,i)=>{
          const color=flatColor(f);
          return <div key={f.id} style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))",
            border:`1px solid ${color}25`,
            borderRadius:18,padding:"20px 22px",
            position:"relative",overflow:"hidden",
            transition:"transform 0.3s,box-shadow 0.3s",
            animation:`slideIn 0.5s ease ${i*0.04}s both`,
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow=`0 16px 40px ${color}18`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>

            {/* Top glows */}
            <div style={{position:"absolute",top:-30,right:-30,width:80,height:80,borderRadius:"50%",background:`${color}12`,pointerEvents:"none"}}/>

            {/* Badges */}
            <div style={{position:"absolute",top:12,right:12,display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
              {f.leaked && <Badge color={C.red} style={{animation:"pulse2 1.2s infinite"}}>⚠ LEAK</Badge>}
              {f.usage>f.threshold && !f.leaked && <Badge color={C.amber}>OVERUSE</Badge>}
            </div>

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>Flat</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:700,color,lineHeight:1}}>{f.id}</div>
                <div style={{fontSize:13,color:"rgba(232,238,248,0.6)",marginTop:3}}>{f.resident}</div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Usage</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:700,color:C.text}}>
                  {f.usage.toLocaleString()}<span style={{fontSize:10,color:C.muted,marginLeft:2}}>L</span>
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                  Threshold: {f.threshold.toLocaleString()} L
                </div>
              </div>
              <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Bill</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:700,color}}>₹{f.bill}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>Block {f.block} · Floor {f.floor}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              <button onClick={()=>sendBill(f)} style={{
                flex:1,padding:"8px 0",borderRadius:9,
                background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.3)",
                color:C.green,fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:4,
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(37,211,102,0.22)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(37,211,102,0.1)"}>
                 Bill
              </button>
              {f.leaked && <button onClick={()=>sendLeak(f)} style={{
                flex:1,padding:"8px 0",borderRadius:9,
                background:"rgba(255,64,96,0.1)",border:"1px solid rgba(255,64,96,0.3)",
                color:C.red,fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:4,
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,64,96,0.22)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,64,96,0.1)"}>
                 Alert
              </button>}
              {f.usage>f.threshold && !f.leaked && <button onClick={()=>sendOver(f)} style={{
                flex:1,padding:"8px 0",borderRadius:9,
                background:"rgba(255,171,0,0.1)",border:"1px solid rgba(255,171,0,0.3)",
                color:C.amber,fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:4,
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,171,0,0.22)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,171,0,0.1)"}>
                 Warn
              </button>}
            </div>
          </div>;
        })}
      </div>
      {shown.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>No flats match the filter.</div>}
    </div>
    <Toasts toasts={toasts}/>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: USER PORTAL
// ═══════════════════════════════════════════════════════════════════
function UserPage({user}) {
  const [flat, setFlat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [toasts, addToast] = useToast();
  const ref = useAnimate(0.1);

  useEffect(() => {
    async function loadData() {
      const flatData = FLAT_METADATA.find(f => f.id === user?.flatId);
      if (flatData) {
        const historyData = await fetchFromAPI("/history/month");
        const billingData = await fetchFromAPI("/billing");
        if (historyData && billingData) {
          const merged = mergeFlatsWithData([flatData], historyData, billingData)[0];
          setFlat(merged);
        } else {
          setFlat({ ...flatData, usage: 0, bill: 0, leaked: false, prev: 0, paid: false });
        }
      } else {
        setFlat({ ...FLAT_METADATA[0], usage: 0, bill: 0, leaked: false, prev: 0, paid: false });
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) {
    return <div style={{paddingTop:62, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div><WaveLoader/><p style={{color:C.muted, marginTop:16}}>Loading your dashboard...</p></div>
    </div>;
  }

  if (!flat) {
    return <div style={{paddingTop:62, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><p style={{color:C.red}}>Flat data not found</p></div>
    </div>;
  }

  const pct=flat.usage/5000;
  const color=flat.leaked?C.red:flat.usage>flat.threshold?C.amber:C.teal;
  const trend=flat.usage-flat.prev;

  // Simulated last 6 months history
  const history=[
    {m:"Sep",u:2100},{m:"Oct",u:2400},{m:"Nov",u:2800},{m:"Dec",u:3100},
    {m:"Jan",u:flat.prev},{m:"Feb",u:flat.usage},
  ];
  const maxH=Math.max(...history.map(h=>h.u));

  const payBill=()=>{ addToast(" Payment initiated via UPI!","success"); };
  const sendSelf=()=>{
    window.open(waLink(flat.phone,billMsg(flat)),"_blank");
    addToast(" Bill summary sent to your WhatsApp","success");
  };

  return <div style={{paddingTop:62}}>
    <div style={{maxWidth:900,margin:"0 auto",padding:"36px 24px"}}>
      {/* Welcome */}
      <div ref={ref} style={{marginBottom:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
          <div>
            <p style={{fontSize:13,color:C.muted,marginBottom:4}}>Welcome back,</p>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,letterSpacing:"-0.02em"}}>{flat.resident}</h1>
            <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
              <Badge color={color}>{flat.id}</Badge>
              <Badge color={C.cyan}>Block {flat.block} · Floor {flat.floor}</Badge>
              {flat.leaked && <Badge color={C.red} style={{animation:"pulse2 1.2s infinite"}}> LEAKAGE DETECTED</Badge>}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn outline color={C.teal} onClick={sendSelf} size="sm">My Bill on WhatsApp</Btn>
            {!flat.paid && <Btn onClick={payBill} size="sm" style={{background:"linear-gradient(135deg,#9b6dff,#6644cc)"}}>Pay ₹{flat.bill}</Btn>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:`1px solid ${C.border}`,paddingBottom:0}}>
        {["overview","history","tips"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"10px 22px",borderRadius:"10px 10px 0 0",border:"none",cursor:"pointer",
            background: tab===t?"rgba(0,195,255,0.12)":"transparent",
            color: tab===t?C.cyan:C.muted,
            fontWeight:tab===t?700:400,fontSize:13,
            borderBottom: tab===t?`2px solid ${C.cyan}`:"2px solid transparent",
            fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",
          }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==="overview" && <>
        {/* Big usage display */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <Card glow={color} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:36,textAlign:"center"}}>
            <div style={{position:"relative",marginBottom:16}}>
              <Ring pct={pct} color={color} size={140} thickness={10}/>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:700,color,lineHeight:1}}>{flat.usage.toLocaleString()}</div>
                <div style={{fontSize:11,color:C.muted}}>Litres</div>
              </div>
            </div>
            <div style={{fontSize:13,color:C.muted,marginBottom:4}}>{MONTH} Usage</div>
            <div style={{fontSize:12,color:trend>0?C.red:C.teal}}>
              {trend>0?"↑ ":"↓ "}{Math.abs(trend)} L vs last month
            </div>
            {flat.usage>flat.threshold && <Badge color={C.amber} style={{marginTop:10}}>⚠ Exceeds 3000L limit</Badge>}
          </Card>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {[
              {label:"Your Bill",val:`₹${flat.bill}`,unit:"this month",color:color},
              {label:"Rate Applied",val:`₹${RATE.toFixed(2)}`,unit:"per litre",color:C.cyan,},
              {label:"Payment",val:flat.paid?"Paid ✓":"Due",unit:flat.paid?"Thank you!":"by 5th March",color:flat.paid?C.teal:C.red},
              {label:"Normal Limit",val:"3,000",unit:"litres / month",color:C.muted},
            ].map((s,i)=>(
              <Card key={i} glow={s.color} style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:24}}>{s.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:700,color:s.color}}>{s.val}
                    <span style={{fontSize:11,color:C.muted,fontFamily:"'Outfit',sans-serif",fontWeight:400,marginLeft:6}}>{s.unit}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {flat.leaked && <div style={{
          background:"rgba(255,64,96,0.08)",border:"1px solid rgba(255,64,96,0.3)",
          borderRadius:16,padding:"20px 24px",marginBottom:20,
          display:"flex",alignItems:"center",gap:16,
        }}>
          <div style={{fontSize:36,animation:"pulse2 1s infinite"}}></div>
          <div>
            <div style={{fontWeight:700,color:C.red,fontSize:16,marginBottom:4}}>Leakage Detected in Your Flat</div>
            <div style={{color:C.muted,fontSize:13}}>IoT sensors have detected unusual water flow. Please check all taps and pipes, then contact maintenance at <strong style={{color:C.text}}>+91 99999 00001</strong>.</div>
          </div>
        </div>}
      </>}

      {tab==="history" && <>
        <Card style={{marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:20,color:C.text}}>6-Month Usage History</div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",height:160}}>
            {history.map((h,i)=>{
              const hp=h.u/maxH;
              const isThis=h.m==="Feb";
              return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{fontSize:11,color:isThis?C.cyan:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{h.u.toLocaleString()}</div>
                <div style={{
                  width:"100%",borderRadius:"6px 6px 0 0",
                  height:hp*120,
                  background: isThis?`linear-gradient(180deg,${C.cyan},${C.teal})`:`rgba(255,255,255,0.08)`,
                  border: isThis?`1px solid ${C.cyan}40`:"none",
                  boxShadow: isThis?`0 0 20px ${C.cyan}30`:"none",
                  transition:"height 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                }}/>
                <div style={{fontSize:11,color:isThis?C.cyan:C.muted}}>{h.m}</div>
              </div>;
            })}
          </div>
        </Card>

        <Card>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Billing History</div>
          {history.map((h,i)=>(
            <div key={i} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"12px 0",borderBottom:i<history.length-1?`1px solid ${C.border}`:"none",
            }}>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{h.m} 2025</div>
                <div style={{fontSize:12,color:C.muted}}>{h.u.toLocaleString()} L used</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.cyan}}>₹{Math.round(h.u*RATE)}</div>
                <div style={{fontSize:11,color:C.teal}}>✓ Paid</div>
              </div>
            </div>
          ))}
        </Card>
      </>}

      {tab==="tips" && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
        {[
          {tip:"Limit showers to 5 minutes. Saves ~30L per shower.",save:"-30L/shower",color:C.cyan},
          {tip:"Turn off tap while brushing teeth. Saves 6L per minute.",save:"-6L/min",color:C.teal},
          {tip:"Fix dripping taps. A slow drip wastes ~20L per day.",save:"-20L/day",color:C.amber},
          {tip:"Use full loads for dishwasher and washing machine.",save:"-50L/load",color:C.purple},
          {tip:"Use a bucket instead of hose pipe for car washing.",save:"-100L/wash",color:C.cyan},
          {tip:"Water plants in the evening to reduce evaporation.",save:"-25L/day",color:C.teal},
        ].map((t,i)=>(
          <Card key={i} glow={t.color} style={{padding:22}}>
            <div style={{fontSize:32,marginBottom:12}}>{t.icon}</div>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:10}}>{t.tip}</p>
            <Badge color={t.color}>{t.save}</Badge>
          </Card>
        ))}
      </div>}
    </div>
    <Toasts toasts={toasts}/>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: LEAKAGE MONITOR
// ═══════════════════════════════════════════════════════════════════
function LeakagePage() {
  const [leaks, setLeaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, addToast] = useToast();
  const [selected, setSelected] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const h1 = useAnimate(0.05);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const alertData = await fetchFromAPI("/alerts");
        if (alertData && typeof alertData === 'object' && !Array.isArray(alertData)) {
          // Convert Firebase object to array
          const alertsArray = Object.entries(alertData).map(([id, value]) => ({ id, ...value }));
          
          // Filter only LEAK type alerts
          const leakAlerts = alertsArray.filter(alert => alert.type === "LEAK");
          
          // Map to flat metadata
          const leaksWithFlatInfo = leakAlerts.map(alert => {
            const flatMeta = FLAT_METADATA.find(f => f.key === alert.flat);
            if (!flatMeta) return null;
            return {
              ...alert,
              flatId: flatMeta.id,
              resident: flatMeta.resident,
              phone: flatMeta.phone,
              block: flatMeta.block,
              floor: flatMeta.floor,
              threshold: flatMeta.threshold,
            };
          }).filter(Boolean); // Remove nulls
          
          setLeaks(leaksWithFlatInfo);
        } else {
          setLeaks([]);
        }
      } catch (error) {
        console.error("Error loading alerts:", error);
        setLeaks([]);
      }
      setLoading(false);
      setLastUpdate(new Date());
    }
    
    loadAlerts();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const alert = (leak) => {
    const flatForMsg = { id: leak.flatId, resident: leak.resident };
    window.open(waLink(leak.phone, leakMsg(flatForMsg)), "_blank");
    addToast(`Leakage alert sent to ${leak.resident}`, "error");
  };
  
  const alertAll = () => {
    leaks.forEach((leak, i) => {
      const flatForMsg = { id: leak.flatId, resident: leak.resident };
      setTimeout(() => window.open(waLink(leak.phone, leakMsg(flatForMsg)), "_blank"), i * 700);
    });
    addToast(`Alerts sent to ${leaks.length} resident${leaks.length !== 1 ? "s" : ""}`, "error");
  };

  if (loading) {
    return <div style={{paddingTop:62, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div><WaveLoader/><p style={{color:C.muted, marginTop:16}}>Loading leakage data...</p></div>
    </div>;
  }

  return <div style={{paddingTop:62}}>
    <div style={{
      background:"rgba(4,8,16,0.8)",backdropFilter:"blur(16px)",
      borderBottom:`1px solid ${C.border}`,
      padding:"20px 36px",display:"flex",justifyContent:"space-between",alignItems:"center",
    }}>
      <div ref={h1}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🚨 Leakage Monitor</h1>
        <p style={{color:C.muted,fontSize:13}}>Real-time IoT sensor network · auto-refresh every 5s</p>
      </div>
      {leaks.length > 0 && <Btn onClick={alertAll} color={C.red} icon="📲">Alert All Residents</Btn>}
    </div>

    <div style={{padding:"32px 36px",maxWidth:1200,margin:"0 auto"}}>
      {/* Status band */}
      <div style={{
        background:`linear-gradient(90deg,${leaks.length > 0 ? "rgba(255,64,96,0.1),rgba(255,64,96,0.04)" : "rgba(0,229,195,0.1),rgba(0,229,195,0.04)"})`,
        border:`1px solid ${leaks.length > 0 ? "rgba(255,64,96,0.25)" : "rgba(0,229,195,0.25)"}`,
        borderRadius:14,padding:"16px 24px",marginBottom:28,
        display:"flex",alignItems:"center",gap:16,
      }}>
        <div style={{
          width:10,height:10,borderRadius:"50%",
          background: leaks.length > 0 ? C.red : C.teal,
          animation: leaks.length > 0 ? "pulse2 1s infinite" : "none",
          flexShrink:0
        }}/>
        <span style={{color: leaks.length > 0 ? C.red : C.teal, fontWeight:700, fontSize:15}}>
          {leaks.length} Active Leakage{leaks.length !== 1 ? "s" : ""}
        </span>
        <span style={{color:C.muted,fontSize:13}}>|</span>
        <span style={{color:C.muted,fontSize:13}}>
          {leaks.length > 0 ? "Real-time alerts from Firebase" : "All systems normal"}
        </span>
        <span style={{marginLeft:"auto",color:C.muted,fontSize:12}}>
          Last update: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      {/* Leak detail cards */}
      <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,marginBottom:16}}>Live Leak Alerts</h3>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {leaks.map((leak,i)=>(
          <div key={leak.id} style={{
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,64,96,0.25)",
            borderLeft:"4px solid "+C.red,
            borderRadius:16,padding:"22px 26px",
            display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:24,alignItems:"center",
            animation:`slideIn 0.5s ease ${i*0.1}s both`,
            transition:"box-shadow 0.3s",cursor:"pointer",
          }}
          onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 8px 30px rgba(255,64,96,0.15)`}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
          onClick={()=>setSelected(selected===leak.flatId?null:leak.flatId)}>

            <div>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                <Badge color={C.red}>LEAK ALERT</Badge>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:28,fontWeight:700,color:C.red}}>
                {leak.flatId}
              </div>
              <div style={{fontSize:14,color:"rgba(232,238,248,0.65)",marginTop:2}}>{leak.resident}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>📍 Block {leak.block} · Floor {leak.floor}</div>
            </div>

            <div>
              <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>
                Detection Info
              </div>
              <div style={{fontSize:13,color:C.text,marginBottom:4}}>
                {leak.message || "Water leakage detected"}
              </div>
              <div style={{fontSize:13,color:C.muted}}>
                🕒 {new Date(leak.time * 1000).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>
                Alert Type
              </div>
              <div style={{fontSize:16,fontWeight:700,color:C.red,marginBottom:4}}>
                {leak.type}
              </div>
              <div style={{fontSize:11,color:C.muted}}>
                Contact: +{leak.phone.slice(0,5)}xxxxx
              </div>
            </div>

            <Btn onClick={(e)=>{e.stopPropagation();alert(leak);}} color={C.green} outline icon="💬">
              WhatsApp
            </Btn>
          </div>
        ))}
        
        {leaks.length === 0 && <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:56,marginBottom:12}}>✅</div>
          <div style={{fontSize:20,fontWeight:700,color:C.teal}}>No Leakages Detected</div>
          <div style={{color:C.muted,marginTop:6}}>All sensors reporting normal · System monitoring active</div>
        </div>}
      </div>
    </div>
    <Toasts toasts={toasts}/>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  const login  = (u) => setUser(u);
  const logout = () => { setUser(null); setPage("home"); };

  // Guard pages
  const goPage = (p) => {
    if ((p==="admin"||p==="analytics") && user?.role!=="admin") { setPage("login"); return; }
    if (p==="user" && !user) { setPage("login"); return; }
    setPage(p);
  };

  return <>
    <style>{GLOBAL_CSS}</style>
    <NavBar page={page} setPage={goPage} user={user} onLogout={logout}/>
    {page==="home"      && <HomePage     setPage={goPage}/>}
    {page==="login"     && <LoginPage    onLogin={login} setPage={setPage}/>}
    {page==="admin"     && <AdminPage    setPage={goPage}/>}
    {page==="user"      && <UserPage     user={user}/>}
    {page==="leakage"   && <LeakagePage />}
  </>;
}
