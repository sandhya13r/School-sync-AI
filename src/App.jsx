import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import {
  LayoutDashboard, Users, GraduationCap, CalendarClock, FileText, MessageSquare,
  AlertTriangle, CheckCircle2, LogOut, Search, Bell, Upload, Sparkles, BookOpen,
  ClipboardList, TrendingDown, TrendingUp, X, RefreshCw, Clock, Filter, Loader2,
  Wand2, Send, Building2, ChevronRight, UserCog, Printer, ShieldCheck, Info, Moon, Sun
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

/* Outside Claude.ai, window.storage (Anthropic's artifact persistence API) doesn't exist.
   This polyfill makes the app work standalone (local dev, GitHub Pages, etc.) by backing
   the same get/set/delete/list interface with localStorage. It only activates when the
   real API isn't already present, so behaviour inside Claude.ai is unchanged. */
if (typeof window !== "undefined" && !window.storage) {
  const ns = (shared, key) => (shared ? "ssa_shared:" : "ssa_local:") + key;
  window.storage = {
    async get(key, shared){
      const v = window.localStorage.getItem(ns(shared, key));
      if (v === null) throw new Error("Key not found: " + key);
      return { key, value: v, shared: !!shared };
    },
    async set(key, value, shared){
      window.localStorage.setItem(ns(shared, key), value);
      return { key, value, shared: !!shared };
    },
    async delete(key, shared){
      window.localStorage.removeItem(ns(shared, key));
      return { key, deleted: true, shared: !!shared };
    },
    async list(prefix, shared){
      const p = ns(shared, prefix || "");
      const keys = Object.keys(window.localStorage).filter(k=>k.startsWith(p)).map(k=>k.slice(ns(shared,"").length));
      return { keys, prefix, shared: !!shared };
    },
  };
}

/* ============================== DESIGN TOKENS ============================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');

:root{
  --bg:#F5F6FC; --surface:#FFFFFF; --surface-2:#EFF1F9; --surface-3:#E7E9F6; --border:#E3E5F1;
  --text:#13152B; --text-dim:#5B5F84; --text-faint:#9599BC;
  --primary:#3E4DE8; --primary-dark:#2E3BCB; --primary-tint:#EAEBFD;
  --ai:#0D9C8D; --ai-tint:#E1F6F2;
  --critical:#E0333C; --critical-tint:#FCE7E8;
  --high:#EF8F3E; --high-tint:#FDECDD;
  --medium:#C0921A; --medium-tint:#FBF1DA;
  --low:#219A63; --low-tint:#E0F3E9;
  --sidebar:#12142A; --sidebar-text:#9EA2C9; --sidebar-active:#262A54;
  --shadow-sm:0 1px 2px rgba(20,22,50,.04);
  --shadow-md:0 10px 30px -8px rgba(20,22,50,.14);
  --shadow-lg:0 24px 60px -12px rgba(20,22,50,.22);
  --radius:10px; --radius-lg:14px;
  --font: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  --font-display: 'Space Grotesk', var(--font);
}
.ssa-root[data-theme="dark"]{
  --bg:#0C0D18; --surface:#14162A; --surface-2:#1B1D38; --surface-3:#232748; --border:#282C50;
  --text:#EDEEFB; --text-dim:#A6AAD3; --text-faint:#6D71A0;
  --primary:#7B87FF; --primary-dark:#5F6CEE; --primary-tint:#22254C;
  --ai:#37E4CC; --ai-tint:#0F332F;
  --critical:#FF6B72; --critical-tint:#3B1520;
  --high:#FFAE5C; --high-tint:#3A270F;
  --medium:#F0C55A; --medium-tint:#332908;
  --low:#5CE0A0; --low-tint:#0E2F22;
  --sidebar:#08091A; --sidebar-text:#8E92C0; --sidebar-active:#22264c;
  --shadow-sm:0 1px 2px rgba(0,0,0,.3);
  --shadow-md:0 10px 30px -8px rgba(0,0,0,.5);
  --shadow-lg:0 24px 60px -12px rgba(0,0,0,.6);
}
*{box-sizing:border-box;}
.ssa-root{font-family:var(--font); color:var(--text); background:var(--bg); min-height:100vh; font-size:14px; line-height:1.45; transition:background-color .25s ease, color .25s ease;}
.ssa-root button, .ssa-root input, .ssa-root select, .ssa-root textarea{font-family:inherit; font-size:inherit;}
.ssa-root ::selection{background:var(--primary-tint);}
.scroll-thin::-webkit-scrollbar{width:8px; height:8px;}
.scroll-thin::-webkit-scrollbar-thumb{background:var(--border); border-radius:8px;}

.theme-toggle{position:relative; width:52px; height:30px; border-radius:99px; border:1px solid var(--border); background:var(--surface-2); cursor:pointer; flex-shrink:0; transition:background-color .2s ease;}
.theme-toggle-knob{position:absolute; top:2px; left:2px; width:24px; height:24px; border-radius:50%; background:var(--surface); box-shadow:var(--shadow-sm); display:flex; align-items:center; justify-content:center; transition:transform .22s cubic-bezier(.4,0,.2,1); color:var(--text-dim);}
.ssa-root[data-theme="dark"] .theme-toggle-knob{transform:translateX(22px); color:var(--primary);}

/* ---- layout shell ---- */
.shell{display:flex; min-height:100vh;}
.sidebar{width:236px; flex-shrink:0; background:var(--sidebar); color:var(--sidebar-text); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; transition:background-color .25s ease; border-right:1px solid rgba(255,255,255,.04);}
.brand{display:flex; align-items:center; gap:10px; padding:20px 18px 16px 18px;}
.brand-mark{width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,var(--primary),var(--ai)); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 14px -2px rgba(62,77,232,.5);}
.brand-name{font-family:var(--font-display); font-weight:700; color:#fff; font-size:15.5px; letter-spacing:.2px;}
.brand-tag{font-size:10.5px; color:var(--sidebar-text); letter-spacing:.4px; text-transform:uppercase;}
.nav{flex:1; overflow-y:auto; padding:6px 10px;}
.nav-item{display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:9px; color:var(--sidebar-text); cursor:pointer; font-size:13.3px; font-weight:500; margin-bottom:2px; transition:background .14s ease, color .14s ease; border:none; background:transparent; width:100%; text-align:left; position:relative;}
.nav-item:hover{background:rgba(255,255,255,.06); color:#fff;}
.nav-item.active{background:var(--sidebar-active); color:#fff;}
.nav-item.active::before{content:""; position:absolute; left:-10px; top:8px; bottom:8px; width:3px; border-radius:0 3px 3px 0; background:linear-gradient(180deg,var(--primary),var(--ai));}
.nav-item svg{flex-shrink:0;}
.nav-section-label{font-size:10.5px; text-transform:uppercase; letter-spacing:.6px; color:#585d84; padding:14px 12px 6px 12px;}
.sidebar-foot{padding:12px; border-top:1px solid rgba(255,255,255,.06);}
.user-chip{display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:9px;}
.avatar{width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:#fff; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,.15);}
.user-chip-name{color:#fff; font-size:12.5px; font-weight:600;}
.user-chip-role{color:var(--sidebar-text); font-size:11px; text-transform:capitalize;}
.logout-btn{display:flex; align-items:center; gap:7px; color:var(--sidebar-text); background:none; border:none; font-size:12px; cursor:pointer; padding:8px 10px; width:100%; border-radius:8px; transition:background .14s ease, color .14s ease;}
.logout-btn:hover{background:rgba(255,255,255,.06); color:#fff;}

.main{flex:1; min-width:0; display:flex; flex-direction:column;}
.topbar{display:flex; align-items:center; justify-content:space-between; padding:14px 26px; border-bottom:1px solid var(--border); background:var(--surface); position:sticky; top:0; z-index:5; transition:background-color .25s ease, border-color .25s ease;}
.topbar-title{font-family:var(--font-display); font-size:19px; font-weight:700;}
.topbar-sub{font-size:12px; color:var(--text-dim); margin-top:2px;}
.search-box{display:flex; align-items:center; gap:8px; background:var(--surface-2); border:1px solid var(--border); border-radius:9px; padding:7px 12px; width:280px; color:var(--text-dim); transition:border-color .15s ease, background-color .2s ease;}
.search-box:focus-within{border-color:var(--primary);}
.search-box input{border:none; background:none; outline:none; width:100%; color:var(--text);}
.icon-btn{position:relative; width:36px; height:36px; border-radius:9px; border:1px solid var(--border); background:var(--surface); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-dim); transition:background-color .15s ease, border-color .15s ease, transform .1s ease;}
.icon-btn:hover{background:var(--surface-2); color:var(--text);}
.icon-btn:active{transform:scale(.94);}
.badge-dot{position:absolute; top:-3px; right:-3px; background:var(--critical); color:#fff; font-size:9.5px; font-weight:700; border-radius:9px; padding:1px 5px; min-width:16px; text-align:center;}
.content{padding:24px 26px 60px 26px; max-width:1360px; animation:ssa-page-in .24s ease-out;}
@keyframes ssa-page-in{from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);}}

/* ---- primitives ---- */
.card{background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:18px; box-shadow:var(--shadow-sm); transition:background-color .25s ease, border-color .25s ease, box-shadow .2s ease;}
.section-title{font-family:var(--font-display); font-size:15.5px; font-weight:700; display:flex; align-items:center; gap:8px; margin:0 0 12px 0;}
.grid{display:grid; gap:16px;}
.stat-grid{grid-template-columns:repeat(auto-fit,minmax(190px,1fr));}
.stat-card{background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 18px; box-shadow:var(--shadow-sm); transition:transform .18s cubic-bezier(.4,0,.2,1), box-shadow .18s ease, background-color .25s ease, border-color .25s ease;}
.stat-card:hover{transform:translateY(-2px); box-shadow:var(--shadow-md);}
.stat-label{font-size:12px; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.3px;}
.stat-value{font-family:var(--font-display); font-size:26px; font-weight:700; margin-top:6px;}
.stat-trend{font-size:11.5px; margin-top:4px; display:flex; align-items:center; gap:4px;}
.trend-up{color:var(--low);} .trend-down{color:var(--critical);}

.btn{display:inline-flex; align-items:center; gap:7px; padding:9px 15px; border-radius:9px; font-weight:600; font-size:13px; cursor:pointer; border:1px solid transparent; transition:filter .12s ease, transform .1s ease, box-shadow .15s ease;}
.btn:hover{filter:brightness(0.97);}
.btn:active{transform:scale(.97);}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:#fff; box-shadow:0 6px 16px -4px rgba(62,77,232,.45);}
.btn-secondary{background:var(--surface); color:var(--text); border-color:var(--border);}
.btn-secondary:hover{background:var(--surface-2);}
.btn-ghost{background:transparent; color:var(--text-dim); border-color:transparent;}
.btn-ghost:hover{background:var(--surface-2);}
.btn-danger{background:var(--critical-tint); color:var(--critical); border-color:transparent;}
.btn-ai{background:linear-gradient(135deg,var(--ai),#0B8478); color:#fff; box-shadow:0 6px 16px -4px rgba(13,156,141,.4);}
.btn-sm{padding:6px 11px; font-size:12px;}
.btn:disabled{opacity:.5; cursor:not-allowed; transform:none;}

.badge{display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:700; letter-spacing:.2px; white-space:nowrap;}
.badge-critical{background:var(--critical-tint); color:var(--critical);}
.badge-high{background:var(--high-tint); color:var(--high);}
.badge-medium{background:var(--medium-tint); color:var(--medium);}
.badge-low{background:var(--low-tint); color:var(--low);}
.badge-ai{background:var(--ai-tint); color:var(--ai);}
.badge-neutral{background:var(--surface-2); color:var(--text-dim);}
.badge-primary{background:var(--primary-tint); color:var(--primary);}

.alert-row{display:flex; align-items:flex-start; gap:12px; padding:12px 8px; border-bottom:1px solid var(--border); cursor:pointer; border-radius:8px; transition:background-color .15s ease;}
.alert-row:last-child{border-bottom:none;}
.alert-row:hover{background:var(--surface-2);}
.alert-dot{width:8px; height:8px; border-radius:50%; margin-top:6px; flex-shrink:0;}
.alert-text{font-size:13.3px; font-weight:600;}
.alert-sub{font-size:11.5px; color:var(--text-dim); margin-top:2px;}

table.dtable{width:100%; border-collapse:collapse; font-size:13px;}
.dtable th{text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.3px; color:var(--text-dim); padding:9px 12px; border-bottom:1px solid var(--border); font-weight:700;}
.dtable td{padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle;}
.dtable tr:last-child td{border-bottom:none;}
.dtable tr{transition:background-color .12s ease;}
.dtable tr:hover td{background:var(--surface-2);}

.input, select.input, textarea.input{width:100%; padding:9px 11px; border-radius:8px; border:1px solid var(--border); background:var(--surface); outline:none; color:var(--text); transition:border-color .15s ease, box-shadow .15s ease;}
.input:focus{border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-tint);}
.field-label{font-size:12px; font-weight:600; color:var(--text-dim); margin-bottom:5px; display:block;}

.tabs{display:flex; gap:4px; border-bottom:1px solid var(--border); margin-bottom:18px;}
.tab{padding:9px 14px; font-size:13px; font-weight:600; color:var(--text-dim); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s ease, border-color .15s ease;}
.tab.active{color:var(--primary); border-color:var(--primary);}

.modal-overlay{position:fixed; inset:0; background:rgba(8,9,20,.55); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; animation:ssa-fade .15s ease-out;}
.modal{background:var(--surface); border-radius:var(--radius-lg); max-width:560px; width:100%; max-height:88vh; overflow-y:auto; padding:22px; box-shadow:var(--shadow-lg); animation:ssa-pop .18s cubic-bezier(.2,.9,.3,1.2);}
.drawer-overlay{position:fixed; inset:0; background:rgba(8,9,20,.5); z-index:50; animation:ssa-fade .15s ease-out;}
.drawer{position:fixed; top:0; right:0; height:100vh; width:420px; max-width:92vw; background:var(--surface); z-index:51; padding:22px; overflow-y:auto; box-shadow:var(--shadow-lg); animation:ssa-slide .2s cubic-bezier(.2,.9,.3,1.1);}
@keyframes ssa-fade{from{opacity:0;} to{opacity:1;}}
@keyframes ssa-pop{from{opacity:0; transform:scale(.96) translateY(4px);} to{opacity:1; transform:scale(1) translateY(0);}}
@keyframes ssa-slide{from{transform:translateX(24px); opacity:.6;} to{transform:translateX(0); opacity:1;}}

.empty-state{text-align:center; padding:40px 20px; color:var(--text-dim);}
.empty-state svg{margin-bottom:10px; opacity:.5;}

.conf-bar{height:6px; background:var(--surface-2); border-radius:4px; overflow:hidden; width:100%;}
.conf-fill{height:100%; border-radius:4px; transition:width .3s ease;}

.spin{animation:ssa-spin 0.8s linear infinite;}
@keyframes ssa-spin{to{transform:rotate(360deg);}}
.toast-wrap{position:fixed; bottom:20px; right:20px; z-index:100; display:flex; flex-direction:column; gap:8px;}
.toast{background:var(--text); color:var(--bg); padding:11px 16px; border-radius:9px; font-size:13px; font-weight:600; box-shadow:var(--shadow-lg); display:flex; align-items:center; gap:8px; animation:toastIn .18s ease-out;}
@keyframes toastIn{from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);}}

.chat-wrap{display:flex; flex-direction:column; gap:14px; max-width:760px;}
.chat-bubble{padding:11px 15px; border-radius:12px; font-size:13.5px; max-width:80%;}
.chat-user{background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:#fff; align-self:flex-end; border-bottom-right-radius:3px;}
.chat-ai{background:var(--surface); border:1px solid var(--border); align-self:flex-start; border-bottom-left-radius:3px; box-shadow:var(--shadow-sm);}
.chat-row{display:flex; flex-direction:column;}
.chat-row.user{align-items:flex-end;}
.chat-row.ai{align-items:flex-start;}
.suggest-chip{border:1px solid var(--border); background:var(--surface); padding:7px 12px; border-radius:99px; font-size:12.5px; cursor:pointer; color:var(--text-dim); font-weight:600; transition:border-color .15s ease, color .15s ease, background-color .15s ease;}
.suggest-chip:hover{border-color:var(--primary); color:var(--primary); background:var(--primary-tint);}

.tt-grid{display:grid; grid-template-columns:70px repeat(6,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:10px; overflow:hidden;}
.tt-cell{background:var(--surface); padding:8px; min-height:56px; font-size:11.5px; transition:background-color .25s ease;}
.tt-head{background:var(--surface-2); font-weight:700; text-align:center; padding:9px 4px; font-size:11.5px;}
.tt-slot{border-radius:6px; padding:5px 6px; font-size:11px; line-height:1.3;}
.tt-conflict{outline:2px solid var(--critical); background:var(--critical-tint) !important;}

.login-wrap{min-height:100vh; display:flex; align-items:stretch; background:var(--sidebar); transition:background-color .25s ease;}
.login-left{flex:1.1; display:flex; flex-direction:column; justify-content:center; padding:64px; color:#fff; position:relative; overflow:hidden;}
.login-left::before{content:""; position:absolute; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle,rgba(62,77,232,.35),transparent 70%); top:-160px; right:-160px; pointer-events:none;}
.login-left::after{content:""; position:absolute; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle,rgba(13,156,141,.28),transparent 70%); bottom:-140px; left:-80px; pointer-events:none;}
.login-right{flex:1; background:var(--bg); display:flex; align-items:center; justify-content:center; padding:40px; position:relative; transition:background-color .25s ease;}
.login-theme-toggle{position:absolute; top:24px; right:28px; z-index:2;}
.login-card{background:var(--surface); border-radius:var(--radius-lg); padding:34px; width:100%; max-width:400px; border:1px solid var(--border); box-shadow:var(--shadow-lg); position:relative; z-index:1; transition:background-color .25s ease, border-color .25s ease;}
.email-dropdown{position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:var(--shadow-md); z-index:10; padding:6px; max-height:260px; overflow-y:auto;}
.email-dropdown-label{font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; color:var(--text-faint); font-weight:700; padding:6px 8px 4px;}
.email-suggest-row{display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; cursor:pointer; transition:background-color .12s ease;}
.email-suggest-row:hover{background:var(--surface-2);}
.suggest-icon{width:28px; height:28px; border-radius:8px; background:var(--primary-tint); display:flex; align-items:center; justify-content:center; flex-shrink:0;}
.suggest-name{font-size:13px; font-weight:700; color:var(--text);}
.suggest-email{font-size:11px; color:var(--text-dim); text-transform:capitalize; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
`;

/* ============================== SEED DATA ============================== */
const DAYS = ["Mon","Tue","Wed","Thu","Fri"];
const TODAY_IDX = 4; // Fri -- "today" for the demo
const PERIODS = [
  {n:1,t:"8:00–8:45"},{n:2,t:"8:50–9:35"},{n:3,t:"9:40–10:25"},
  {n:4,t:"10:45–11:30"},{n:5,t:"11:35–12:20"},{n:6,t:"1:10–1:55"}
];
const SUBJECTS = [
  {id:"MATH",name:"Mathematics",weekly:6},
  {id:"SCI",name:"Science",weekly:5},
  {id:"ENG",name:"English",weekly:5},
  {id:"SOC",name:"Social Studies",weekly:4},
  {id:"HIN",name:"Hindi",weekly:4},
  {id:"CS",name:"Computer Science",weekly:3,needsLab:true},
  {id:"PE",name:"Physical Education",weekly:2},
  {id:"ART",name:"Art",weekly:1},
];
const CLASSES = ["6A","6B","7A","7B","8A","8B","9A","9B"];
const LABS = ["Lab 1","Lab 2"];
const FIRST=["Arjun","Priya","Rohan","Ananya","Vikram","Kavita","Sanjay","Meera","Rahul","Divya","Karan","Neha","Aditya","Pooja","Suresh","Lakshmi","Farhan","Ritu","Manoj","Swati"];
const LAST=["Mehta","Nair","Sharma","Rao","Shah","Iyer","Gupta","Verma","Kapoor","Reddy","Joshi","Menon","Bhatt","Chawla","Pillai"];
function nm(seed){ const f=FIRST[seed%FIRST.length]; const l=LAST[(seed*7+3)%LAST.length]; return f+" "+l; }
const AVATAR_COLORS=["#3D4CF2","#0E9C8F","#F2994A","#C99A1E","#8B5CF6","#EF6C8E","#2FA36B","#3B82C4"];
function colorFor(id){ let h=0; for(let i=0;i<id.length;i++) h=id.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; }
function initials(n){ return n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase(); }

function buildTeachers(){
  const plan = [
    ["MATH",3],["SCI",2],["ENG",2],["SOC",2],["HIN",2],["CS",2],["PE",1],["ART",1]
  ];
  let teachers=[]; let seed=1;
  plan.forEach(([subj,count])=>{
    for(let i=0;i<count;i++){
      teachers.push({
        id:"T"+seed, name:nm(seed), subjects:[subj],
        maxLoad: subj==="MATH"?24:22
      });
      seed++;
    }
  });
  // give a couple of teachers a secondary qualification (helps substitute pool)
  teachers[0].subjects.push("SCI");
  teachers[3].subjects.push("MATH");
  teachers[6].subjects.push("SOC");
  return teachers;
}

function buildStudents(){
  let students=[]; let seed=1;
  CLASSES.forEach(cls=>{
    for(let i=1;i<=15;i++){
      const id="S"+seed;
      const declining = seed % 19 === 0; // sprinkle a few at-risk academically
      const lowAttendance = seed % 23 === 0;
      const attendancePct = lowAttendance ? 62 + (seed%9) : 82 + (seed%14);
      const marks = {};
      SUBJECTS.forEach(sub=>{
        const base = 55 + (seed*3)%35;
        let t1=base, t2=base+((seed%5)-2)*3, t3=base+((seed%5)-2)*5;
        if(declining && (sub.id==="MATH"||sub.id==="SCI")){ t2 = base-4; t3 = base-20; }
        marks[sub.id]=[
          {term:"Term 1", score:Math.max(30,Math.min(98,t1))},
          {term:"Term 2", score:Math.max(30,Math.min(98,t2))},
          {term:"Term 3", score:Math.max(30,Math.min(98,t3))},
        ];
      });
      let feeStatus="paid", feeDue=0;
      if(seed%7===0){ feeStatus="pending"; feeDue=4500+((seed*137)%3000); }
      if(seed%17===0){ feeStatus="overdue"; feeDue=6000+((seed*211)%4000); }
      students.push({
        id, name:nm(seed+40), cls, rollNo:i, attendancePct,
        marks, feeStatus, feeDue, guardianName: nm(seed+90)+" (Parent)"
      });
      seed++;
    }
  });
  return students;
}

function generateTimetable(teachers, clean){
  const grids={}; CLASSES.forEach(c=>{ grids[c]=DAYS.map(()=>Array(6).fill(null)); });
  const teacherBusy={}; // "day-period" -> Set(teacherId)
  const labBusy={};     // "day-period" -> Set(labName)
  const teacherLoad={}; teachers.forEach(t=>teacherLoad[t.id]=0);
  const key=(d,p)=>d+"-"+p;

  CLASSES.forEach(cls=>{
    SUBJECTS.forEach(sub=>{
      let placed=0, attempts=0;
      const slots=[];
      for(let d=0;d<5;d++) for(let p=0;p<6;p++) slots.push([d,p]);
      // shuffle deterministically based on class+subject
      let s = cls.charCodeAt(0)+cls.charCodeAt(1)+sub.id.length;
      slots.sort((a,b)=> ((a[0]*6+a[1]+s*13)%97) - ((b[0]*6+b[1]+s*13)%97));
      for(const [d,p] of slots){
        if(placed>=sub.weekly) break;
        attempts++;
        if(grids[cls][d][p]) continue;
        const k=key(d,p);
        const qualified = teachers.filter(t=>t.subjects.includes(sub.id));
        const free = qualified.filter(t=> !(teacherBusy[k]&&teacherBusy[k].has(t.id)) && teacherLoad[t.id] < t.maxLoad);
        if(free.length===0) continue;
        free.sort((a,b)=>teacherLoad[a.id]-teacherLoad[b.id]);
        const teacher = free[0];
        let room=null;
        if(sub.needsLab){
          const busyLabs = labBusy[k]||new Set();
          const availLab = LABS.find(l=>!busyLabs.has(l));
          if(!availLab) continue;
          room=availLab;
          if(!labBusy[k]) labBusy[k]=new Set();
          labBusy[k].add(availLab);
        }
        grids[cls][d][p]={subject:sub.id, teacherId:teacher.id, room};
        if(!teacherBusy[k]) teacherBusy[k]=new Set();
        teacherBusy[k].add(teacher.id);
        teacherLoad[teacher.id]++;
        placed++;
      }
    });
  });

  if(!clean){
    const busyAt=(d,p,excludeClasses)=>{
      const s=new Set();
      CLASSES.forEach(c=>{ if(excludeClasses.includes(c)) return; const cell=grids[c][d][p]; if(cell) s.add(cell.teacherId); });
      return s;
    };
    // Search Friday first (falls back to other days) for a period where the required number of
    // qualified, genuinely-free teachers exist, so the injected conflict never causes a collateral one.
    function findSlot(qualifierFn, neededCount, excludeClasses, preferDay){
      const dayOrder=[preferDay, ...[0,1,2,3,4].filter(d=>d!==preferDay)];
      for(const d of dayOrder){
        for(let p=0;p<6;p++){
          const busy = busyAt(d,p,excludeClasses);
          const free = teachers.filter(t=>qualifierFn(t) && !busy.has(t.id));
          if(free.length>=neededCount) return {d,p,free};
        }
      }
      return null;
    }

    // 1) Teacher double-booked
    const slot1 = findSlot(t=>t.subjects.includes("MATH"), 1, ["8B","9A"], TODAY_IDX);
    if(slot1){
      grids["8B"][slot1.d][slot1.p] = {subject:"MATH", teacherId:slot1.free[0].id, room:null};
      grids["9A"][slot1.d][slot1.p] = {subject:"MATH", teacherId:slot1.free[0].id, room:null};
    }

    // 2) Room conflict — two DIFFERENT free CS teachers, same lab, same slot
    const slot2 = findSlot(t=>t.subjects.includes("CS"), 2, ["7A","9B"], TODAY_IDX);
    if(slot2){
      grids["7A"][slot2.d][slot2.p] = {subject:"CS", teacherId:slot2.free[0].id, room:"Lab 2"};
      grids["9B"][slot2.d][slot2.p] = {subject:"CS", teacherId:slot2.free[1].id, room:"Lab 2"};
    }
  }
  return grids;
}

function detectConflicts(timetable, teachers){
  const conflicts=[];
  const byTeacherSlot={}; const byLabSlot={};
  CLASSES.forEach(cls=>{
    DAYS.forEach((day,d)=>{
      PERIODS.forEach((per,p)=>{
        const cell=timetable[cls][d][p];
        if(!cell) return;
        const tk=cell.teacherId+"|"+d+"|"+p;
        if(!byTeacherSlot[tk]) byTeacherSlot[tk]=[];
        byTeacherSlot[tk].push({cls,d,p});
        if(cell.room){
          const lk=cell.room+"|"+d+"|"+p;
          if(!byLabSlot[lk]) byLabSlot[lk]=[];
          byLabSlot[lk].push({cls,d,p});
        }
      });
    });
  });
  Object.entries(byTeacherSlot).forEach(([k,arr])=>{
    if(arr.length>1){
      const [teacherId,d,p]=k.split("|");
      const teacher=teachers.find(t=>t.id===teacherId);
      conflicts.push({
        id:"conf-t-"+k, type:"teacher", severity:"critical",
        title:`Teacher double-booked — ${teacher.name}, ${arr.map(a=>a.cls).join(" & ")}, Period ${Number(p)+1}`,
        detail:`${teacher.name} is scheduled in ${arr.map(a=>a.cls).join(" and ")} at the same time on ${DAYS[d]}.`,
        day:Number(d), period:Number(p), classes:arr.map(a=>a.cls), teacherId
      });
    }
  });
  Object.entries(byLabSlot).forEach(([k,arr])=>{
    if(arr.length>1){
      const [room,d,p]=k.split("|");
      conflicts.push({
        id:"conf-r-"+k, type:"room", severity:"high",
        title:`Classroom conflict — ${room} assigned twice on ${DAYS[d]}, Period ${Number(p)+1}`,
        detail:`${room} is double-booked for ${arr.map(a=>a.cls).join(" and ")} on ${DAYS[d]}.`,
        day:Number(d), period:Number(p), classes:arr.map(a=>a.cls), room
      });
    }
  });
  return conflicts;
}

function resolveConflict(conflict, timetable, teachers){
  const grids = JSON.parse(JSON.stringify(timetable));
  const {d,period} = {d:conflict.day, period:conflict.period};
  if(conflict.type==="teacher"){
    const victimClass = conflict.classes[1];
    const cell = grids[victimClass][d][period];
    const subj = SUBJECTS.find(s=>s.id===cell.subject);
    const busyTeacherIds = new Set();
    CLASSES.forEach(c=>{ const cc=grids[c][d][period]; if(cc) busyTeacherIds.add(cc.teacherId); });
    const candidates = teachers.filter(t=>t.subjects.includes(subj.id) && !busyTeacherIds.has(t.id));
    if(candidates.length){
      grids[victimClass][d][period] = {...cell, teacherId:candidates[0].id};
      return {grids, note:`Reassigned ${victimClass} Period ${period+1} to ${candidates[0].name}.`};
    }
    return {grids:timetable, note:"No free qualified teacher found — try Regenerate instead."};
  } else {
    const victimClass = conflict.classes[1];
    const cell = grids[victimClass][d][period];
    const busyLabs = new Set();
    CLASSES.forEach(c=>{ const cc=grids[c][d][period]; if(cc && cc.room) busyLabs.add(cc.room); });
    const altLab = LABS.find(l=>!busyLabs.has(l));
    if(altLab){
      grids[victimClass][d][period] = {...cell, room:altLab};
      return {grids, note:`Moved ${victimClass} Period ${period+1} to ${altLab}.`};
    }
    return {grids:timetable, note:"Both labs busy at this slot — try Regenerate instead."};
  }
}

function recommendSubstitute(teacherId, day, timetable, teachers, students){
  const affected=[];
  CLASSES.forEach(cls=>{
    PERIODS.forEach((per,p)=>{
      const cell=timetable[cls][day][p];
      if(cell && cell.teacherId===teacherId) affected.push({cls,period:p,subject:cell.subject});
    });
  });
  const teacherLoadToday = {};
  teachers.forEach(t=>{
    let count=0;
    CLASSES.forEach(cls=>{ PERIODS.forEach((per,p)=>{ const c=timetable[cls][day][p]; if(c && c.teacherId===t.id) count++; }); });
    teacherLoadToday[t.id]=count;
  });
  return affected.map(a=>{
    const busy = new Set();
    CLASSES.forEach(cls=>{ const c=timetable[cls][day][a.period]; if(c) busy.add(c.teacherId); });
    const subj = SUBJECTS.find(s=>s.id===a.subject);
    let pool = teachers.filter(t=>t.id!==teacherId && t.subjects.includes(a.subject) && !busy.has(t.id));
    const alreadyTeachesClass = (t)=> DAYS.some((_,dd)=>PERIODS.some((__,pp)=> timetable[a.cls][dd][pp] && timetable[a.cls][dd][pp].teacherId===t.id));
    pool = pool.map(t=>{
      const reasons=[`${subj.name}-qualified`, `Free during Period ${a.period+1}`];
      let score = 100 - teacherLoadToday[t.id]*10;
      reasons.push(`Workload today: ${teacherLoadToday[t.id]} periods`);
      if(alreadyTeachesClass(t)){ score+=15; reasons.push(`Already teaches ${a.cls}`); }
      return {...t, score, reasons};
    }).sort((x,y)=>y.score-x.score);
    return {...a, subject:subj.name, candidates:pool};
  });
}

function seedDocuments(){
  return [
    {
      id:"D1", type:"Admission Form", fileName:"admission_ananya_rao.jpg", status:"pending",
      fields:[
        {key:"Student Name", value:"Ananya Rao", confidence:96},
        {key:"Date of Birth", value:"14 Mar 2015", confidence:94},
        {key:"Class Applying For", value:"6A", confidence:91},
        {key:"Guardian Name", value:"Suresh Rao", confidence:88},
        {key:"Contact Number", value:"98xxxxxx12", confidence:62},
        {key:"Previous School", value:"—", confidence:41},
      ]
    },
    {
      id:"D2", type:"Transfer Certificate", fileName:"tc_vikram_shah.pdf", status:"pending",
      fields:[
        {key:"Student Name", value:"Vikram Shah", confidence:97},
        {key:"Issuing School", value:"Greenwood High", confidence:90},
        {key:"Class Completed", value:"7", confidence:93},
        {key:"Date of Issue", value:"02 Jun 2026", confidence:85},
        {key:"Conduct Remark", value:"Satisfactory", confidence:58},
      ]
    },
    {
      id:"D3", type:"Fee Receipt", fileName:"receipt_9821.jpg", status:"pending",
      fields:[
        {key:"Student Name", value:"Karan Kapoor", confidence:92},
        {key:"Receipt No.", value:"9821", confidence:99},
        {key:"Amount", value:"₹6,000", confidence:96},
        {key:"Date", value:"10 Aug 2026", confidence:89},
        {key:"Payment Method", value:"UPI", confidence:74},
      ]
    },
  ];
}

const QUESTION_BANK = {
  MATH: {
    "Algebra": {
      mcq:["Solve for x: 2x + 5 = 17","Which of these is a linear equation?","Simplify: 3(x+2) - 2x","If x = 4, what is 2x² - 3?"],
      short:["Solve the equation 5x - 3 = 2x + 9 and show your working.","Factorise: x² - 9"],
      long:["A number increased by 12 equals three times the number. Form an equation and solve it, explaining each step."]
    },
    "Geometry": {
      mcq:["The sum of angles in a triangle is:","A quadrilateral with all sides equal is a:"],
      short:["Find the area of a triangle with base 12cm and height 9cm.","Prove that vertically opposite angles are equal."],
      long:["Derive the formula for the circumference of a circle and use it to find the circumference when r = 7cm."]
    }
  },
  SCI: {
    "Photosynthesis": {
      mcq:["Photosynthesis mainly occurs in the:","The gas released during photosynthesis is:"],
      short:["Write the balanced chemical equation for photosynthesis.","Explain the role of chlorophyll."],
      long:["Describe the process of photosynthesis and explain why it is essential for life on Earth."]
    }
  },
  ENG: {
    "Grammar": {
      mcq:["Choose the correctly punctuated sentence:","Identify the verb in: 'She quickly finished her homework.'"],
      short:["Rewrite the sentence in passive voice: 'The teacher explained the lesson.'"],
      long:["Write a short paragraph (80–100 words) describing your favourite season, using at least three adjectives."]
    }
  }
};

function seedComplaints(){
  return [
    {id:"C1", text:"The water cooler on the 2nd floor near Class 8B has not been working for a week.", category:"Infrastructure", priority:"Medium", status:"Open", by:"Parent — Rao family", date:"Wed"},
    {id:"C2", text:"Bus route 4 has been arriving 20 minutes late every morning this week.", category:"Transport", priority:"High", status:"Open", by:"Parent — Iyer family", date:"Tue"},
    {id:"C3", text:"My child was charged twice for the term fee — please check the receipt.", category:"Fees", priority:"High", status:"Open", by:"Parent — Shah family", date:"Mon"},
  ];
}
function triage(text){
  const t=text.toLowerCase();
  const rules=[
    {kw:["fee","paid","receipt","charge","refund"], cat:"Fees", pri:"High"},
    {kw:["bus","route","transport","driver"], cat:"Transport", pri:"Medium"},
    {kw:["water","electric","toilet","classroom","building","broken","leak"], cat:"Infrastructure", pri:"Medium"},
    {kw:["bully","unsafe","injur","accident","danger"], cat:"Safety", pri:"Critical"},
    {kw:["teacher","staff","behav"], cat:"Staff", pri:"High"},
    {kw:["wifi","laptop","app","login","website","system"], cat:"Technology", pri:"Low"},
    {kw:["exam","marks","homework","syllabus","assignment"], cat:"Academic", pri:"Medium"},
  ];
  for(const r of rules){ if(r.kw.some(k=>t.includes(k))) return {category:r.cat, priority:r.pri}; }
  return {category:"Other", priority:"Low"};
}

/* ============================== APP CONTEXT ============================== */
const Ctx = createContext(null);
const useApp = ()=>useContext(Ctx);

function uid(prefix){ return prefix+"-"+Math.random().toString(36).slice(2,9); }

function buildInitialState(){
  const teachers=buildTeachers();
  const students=buildStudents();
  const timetable=generateTimetable(teachers, false);
  const priyaLike = teachers.find(t=>t.subjects.includes("SCI")) || teachers[0];
  return {
    teachers, students, timetable,
    teacherLeave:[{teacherId:priyaLike.id, day:TODAY_IDX, status:"pending"}],
    substitutions:[],
    documents:seedDocuments(),
    complaints:seedComplaints(),
    notifications:[
      {id:uid("n"), text:"Weekly attendance report is ready to review.", read:false, kind:"info"},
    ],
    auditLog:[{id:uid("a"), user:"System", action:"Seeded demo school data", ts:"Mon 08:00"}],
    questionPapers:[],
  };
}

const DEMO_USERS=[
  {email:"admin@schoolos.ai", role:"admin", name:"Ritu Sen", password:"demo123"},
  {email:"teacher@schoolos.ai", role:"teacher", name:null, password:"demo123"},
  {email:"student@schoolos.ai", role:"student", name:null, password:"demo123"},
  {email:"parent@schoolos.ai", role:"parent", name:null, password:"demo123"},
];

/* ============================== SMALL PRIMITIVES ============================== */
function Badge({children, kind="neutral"}){ return <span className={`badge badge-${kind}`}>{children}</span>; }
function StatCard({label, value, trend, trendKind}){
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {trend && <div className={`stat-trend ${trendKind==="up"?"trend-up":trendKind==="down"?"trend-down":""}`}>
        {trendKind==="up" && <TrendingUp size={13}/>}{trendKind==="down" && <TrendingDown size={13}/>}{trend}
      </div>}
    </div>
  );
}
function Avatar({name, size=30}){
  return <div className="avatar" style={{background:colorFor(name), width:size, height:size, fontSize:size*0.4}}>{initials(name)}</div>;
}
function EmptyState({icon, title, sub}){
  return <div className="empty-state">{icon}<div style={{fontWeight:700, color:"var(--text)"}}>{title}</div><div style={{fontSize:12.5, marginTop:4}}>{sub}</div></div>;
}
function ConfBar({value}){
  const color = value>=85?"var(--low)": value>=65?"var(--medium)":"var(--critical)";
  return <div className="conf-bar"><div className="conf-fill" style={{width:value+"%", background:color}}/></div>;
}
function ThemeToggle(){
  const {theme, toggleTheme} = useApp();
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode" title={theme==="light" ? "Switch to dark mode" : "Switch to light mode"}>
      <div className="theme-toggle-knob">{theme==="light" ? <Sun size={13}/> : <Moon size={13}/>}</div>
    </button>
  );
}
function severityColor(sev){ return sev==="critical"?"var(--critical)":sev==="high"?"var(--high)":sev==="medium"?"var(--medium)":"var(--low)"; }

/* ============================== SHELL: SIDEBAR / TOPBAR ============================== */
const NAV = {
  admin:[
    {id:"dashboard", label:"Dashboard", icon:LayoutDashboard},
    {id:"students", label:"Students", icon:GraduationCap},
    {id:"teachers", label:"Teachers", icon:Users},
    {id:"attendance", label:"Attendance & Marks", icon:ClipboardList},
    {id:"timetable", label:"Timetable", icon:CalendarClock},
    {id:"substitutes", label:"Substitutes", icon:UserCog},
    {id:"documents", label:"AI Document Reader", icon:FileText},
    {id:"analytics", label:"Analytics", icon:TrendingUp},
    {id:"complaints", label:"Complaints", icon:AlertTriangle},
    {id:"qpaper", label:"Question Papers", icon:Wand2},
    {id:"assistant", label:"AI Assistant", icon:MessageSquare},
  ],
  teacher:[
    {id:"dashboard", label:"Today", icon:LayoutDashboard},
    {id:"attendance", label:"Attendance & Marks", icon:ClipboardList},
    {id:"timetable", label:"Timetable", icon:CalendarClock},
    {id:"qpaper", label:"Question Papers", icon:Wand2},
    {id:"assistant", label:"AI Assistant", icon:MessageSquare},
  ],
  student:[
    {id:"dashboard", label:"My Dashboard", icon:LayoutDashboard},
    {id:"timetable", label:"Timetable", icon:CalendarClock},
    {id:"marks", label:"Marks", icon:BookOpen},
  ],
  parent:[
    {id:"dashboard", label:"My Child", icon:LayoutDashboard},
    {id:"timetable", label:"Timetable", icon:CalendarClock},
    {id:"marks", label:"Marks", icon:BookOpen},
  ],
};

function Sidebar({view, setView}){
  const {session, logout} = useApp();
  const items = NAV[session.role];
  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Sparkles size={17} color="#fff"/></div>
        <div><div className="brand-name">SchoolSync AI</div><div className="brand-tag">School OS</div></div>
      </div>
      <div className="nav">
        {items.map(it=>{
          const Icon=it.icon;
          return (
            <button key={it.id} className={`nav-item ${view===it.id?"active":""}`} onClick={()=>setView(it.id)}>
              <Icon size={16}/>{it.label}
            </button>
          );
        })}
      </div>
      <div className="sidebar-foot">
        <div className="user-chip">
          <Avatar name={session.name} />
          <div><div className="user-chip-name">{session.name}</div><div className="user-chip-role">{session.role}</div></div>
        </div>
        <button className="logout-btn" onClick={logout}><LogOut size={14}/> Sign out</button>
      </div>
    </div>
  );
}

function Topbar({title, sub}){
  const {data, session} = useApp();
  const [showNotif,setShowNotif]=useState(false);
  const unread = data.notifications.filter(n=>!n.read).length;
  return (
    <div className="topbar">
      <div><div className="topbar-title">{title}</div>{sub && <div className="topbar-sub">{sub}</div>}</div>
      <div style={{display:"flex", alignItems:"center", gap:12}}>
        {session.role==="admin" && <div className="search-box"><Search size={15}/><input placeholder="Search students, teachers, documents…"/></div>}
        <ThemeToggle/>
        <div style={{position:"relative"}}>
          <button className="icon-btn" onClick={()=>setShowNotif(s=>!s)}>
            <Bell size={16}/>{unread>0 && <span className="badge-dot">{unread}</span>}
          </button>
          {showNotif && (
            <div className="card" style={{position:"absolute", right:0, top:44, width:300, zIndex:20, padding:10}}>
              <div style={{fontWeight:700, fontSize:12.5, padding:"4px 6px 8px"}}>Notifications</div>
              {data.notifications.length===0 && <div style={{fontSize:12.5, color:"var(--text-dim)", padding:6}}>You're all caught up.</div>}
              {data.notifications.slice().reverse().map(n=>(
                <div key={n.id} style={{padding:"8px 6px", fontSize:12.5, borderTop:"1px solid var(--border)"}}>{n.text}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== LOGIN ============================== */
function Login(){
  const {login, data} = useApp();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [showDropdown,setShowDropdown]=useState(false);
  const wrapRef=useRef(null);
  const sampleTeacher = data.teachers[0].name;
  const sampleStudent = data.students[0].name;
  const demoAccounts=[
    {role:"admin", name:"Ritu Sen", email:"admin@schoolos.ai", icon:LayoutDashboard},
    {role:"teacher", name:sampleTeacher, email:"teacher@schoolos.ai", icon:Users},
    {role:"student", name:sampleStudent, email:"student@schoolos.ai", icon:GraduationCap},
    {role:"parent", name:`Parent of ${sampleStudent}`, email:"parent@schoolos.ai", icon:BookOpen},
  ];
  const q = email.trim().toLowerCase();
  const filtered = demoAccounts.filter(a=> !q || a.email.toLowerCase().includes(q) || a.role.includes(q) || a.name.toLowerCase().includes(q));

  useEffect(()=>{
    function onDocMouseDown(e){
      if(wrapRef.current && !wrapRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return ()=>document.removeEventListener("mousedown", onDocMouseDown);
  },[]);

  function submit(e){
    e.preventDefault();
    const u = DEMO_USERS.find(u=>u.email.toLowerCase()===email.trim().toLowerCase() && u.password===password.trim());
    if(!u){ setError("Email or password not recognised. Start typing your email to see demo accounts."); return; }
    login(u.email);
  }
  function selectDemo(acc){
    setEmail(acc.email); setPassword("demo123"); setError(""); setShowDropdown(false);
    login(acc.email);
  }
  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="brand-mark" style={{width:44,height:44,marginBottom:22}}><Sparkles size={22} color="#fff"/></div>
        <div style={{fontFamily:"var(--font-display)", fontSize:34, fontWeight:700, lineHeight:1.15, maxWidth:480}}>Your school. One intelligent operating system.</div>
        <div style={{color:"var(--sidebar-text)", marginTop:14, maxWidth:440, fontSize:14.5}}>Digitize the paperwork. Automate the schedule. Get alerted before small problems become crises.</div>
        <div style={{display:"flex", gap:22, marginTop:36}}>
          {[["Digitize","AI reads forms into data"],["Automate","Conflict-free scheduling"],["Anticipate","Proactive alerts, not searches"]].map(([h,s])=>(
            <div key={h}><div style={{fontWeight:700, color:"#fff", fontSize:13.5}}>{h}</div><div style={{fontSize:11.5, color:"var(--sidebar-text)", marginTop:3, maxWidth:130}}>{s}</div></div>
          ))}
        </div>
      </div>
      <div className="login-right">
        <div className="login-theme-toggle"><ThemeToggle/></div>
        <div className="login-card">
          <div style={{fontFamily:"var(--font-display)", fontWeight:700, fontSize:19, marginBottom:4}}>Sign in</div>
          <div style={{fontSize:12.5, color:"var(--text-dim)", marginBottom:22}}>Enter your school email to continue.</div>
          <form onSubmit={submit}>
            <label className="field-label">Email</label>
            <div style={{position:"relative"}} ref={wrapRef}>
              <input
                className="input" style={{marginBottom:11}} autoComplete="off"
                value={email}
                onChange={e=>{ setEmail(e.target.value); setShowDropdown(true); setError(""); }}
                onFocus={()=>setShowDropdown(true)}
                placeholder="you@schoolos.ai"
              />
              {showDropdown && filtered.length>0 && (
                <div className="email-dropdown">
                  <div className="email-dropdown-label">Demo accounts</div>
                  {filtered.map(acc=>{
                    const Icon=acc.icon;
                    return (
                      <div key={acc.role} className="email-suggest-row" onClick={()=>selectDemo(acc)}>
                        <div className="suggest-icon"><Icon size={14} color="var(--primary)"/></div>
                        <div style={{minWidth:0}}>
                          <div className="suggest-name">{acc.name}</div>
                          <div className="suggest-email">{acc.email} · {acc.role}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <label className="field-label">Password</label>
            <input className="input" style={{marginBottom:6}} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
            {error && <div style={{color:"var(--critical)", fontSize:12, marginTop:6}}>{error}</div>}
            <button className="btn btn-primary" style={{width:"100%", justifyContent:"center", marginTop:16}} type="submit">Sign in</button>
          </form>
          <div style={{fontSize:11, color:"var(--text-faint)", marginTop:16, textAlign:"center"}}>All demo accounts use the password <b>demo123</b></div>
        </div>
      </div>
    </div>
  );
}

export default function Root(){
  return <ShellRoot/>;
}

function ShellRoot(){
  const [data,setData]=useState(null);
  const [session,setSession]=useState(null);
  const [view,setView]=useState("dashboard");
  const [toasts,setToasts]=useState([]);
  const [theme,setTheme]=useState("light");
  const loadedRef=useRef(false);

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await window.storage.get("schoolsync_state", false);
        if(res && res.value){ setData(JSON.parse(res.value)); }
        else { setData(buildInitialState()); }
      }catch(e){ setData(buildInitialState()); }
      try{
        const tres = await window.storage.get("schoolsync_theme", false);
        if(tres && tres.value){ setTheme(tres.value); }
        else if(typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches){ setTheme("dark"); }
      }catch(e){}
      loadedRef.current=true;
    })();
  },[]);

  useEffect(()=>{
    if(!loadedRef.current || !data) return;
    window.storage.set("schoolsync_state", JSON.stringify(data), false).catch(()=>{});
  },[data]);

  function toggleTheme(){
    setTheme(t=>{
      const next = t==="light" ? "dark" : "light";
      window.storage.set("schoolsync_theme", next, false).catch(()=>{});
      return next;
    });
  }

  function toast(text){
    const id=uid("toast");
    setToasts(t=>[...t,{id,text}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3200);
  }
  function login(email){
    const u = DEMO_USERS.find(x=>x.email===email);
    if(!u) return;
    let name=u.name, extra={};
    if(u.role==="teacher"){ name=data.teachers[0].name; extra.teacherId=data.teachers[0].id; }
    if(u.role==="student"){ name=data.students[0].name; extra.studentId=data.students[0].id; }
    if(u.role==="parent"){ name=`Parent of ${data.students[0].name}`; extra.studentId=data.students[0].id; }
    setSession({email, role:u.role, name, ...extra});
    setView("dashboard");
  }
  function logout(){ setSession(null); }

  if(!data) return (
    <div className="ssa-root" data-theme={theme} style={{display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Loader2 className="spin" size={26} color="var(--primary)"/>
    </div>
  );

  return (
    <div className="ssa-root" data-theme={theme}>
      <style>{CSS}</style>
      <Ctx.Provider value={{data, setData, session, login, logout, toast, theme, toggleTheme}}>
        {!session ? <Login/> : (
          <div className="shell">
            <Sidebar view={view} setView={setView}/>
            <div className="main">
              <ViewRouter view={view} setView={setView}/>
            </div>
          </div>
        )}
        <div className="toast-wrap">
          {toasts.map(t=>(<div key={t.id} className="toast"><CheckCircle2 size={15}/>{t.text}</div>))}
        </div>
      </Ctx.Provider>
    </div>
  );
}

function ViewRouter({view, setView}){
  const {session} = useApp();
  if(session.role==="admin"){
    if(view==="dashboard") return <AdminDashboard setView={setView}/>;
    if(view==="students") return <StudentsPage/>;
    if(view==="teachers") return <TeachersPage/>;
    if(view==="attendance") return <AttendancePage/>;
    if(view==="timetable") return <TimetablePage/>;
    if(view==="substitutes") return <SubstitutesPage/>;
    if(view==="documents") return <DocumentsPage/>;
    if(view==="analytics") return <AnalyticsPage/>;
    if(view==="complaints") return <ComplaintsPage/>;
    if(view==="qpaper") return <QuestionPaperPage/>;
    if(view==="assistant") return <AssistantPage/>;
  }
  if(session.role==="teacher"){
    if(view==="dashboard") return <TeacherDashboard/>;
    if(view==="attendance") return <AttendancePage/>;
    if(view==="timetable") return <TimetablePage/>;
    if(view==="qpaper") return <QuestionPaperPage/>;
    if(view==="assistant") return <AssistantPage/>;
  }
  if(session.role==="student"||session.role==="parent"){
    if(view==="dashboard") return <FamilyDashboard/>;
    if(view==="timetable") return <TimetablePage readOnlyClass={"6A"}/>;
    if(view==="marks") return <FamilyMarks/>;
  }
  return null;
}

/* ============================== ADMIN DASHBOARD ============================== */
function buildAlerts(data){
  const conflicts = detectConflicts(data.timetable, data.teachers);
  const alerts=[...conflicts];
  data.teacherLeave.filter(l=>l.status==="pending").forEach(l=>{
    const t=data.teachers.find(x=>x.id===l.teacherId);
    const periodsAffected = recommendSubstitute(l.teacherId, l.day, data.timetable, data.teachers, data.students).length;
    alerts.push({id:"leave-"+l.teacherId, type:"substitute", severity:"high",
      title:`Substitute required — ${t.name} on leave, ${periodsAffected} period${periodsAffected!==1?"s":""} today`,
      detail:`${t.name} is on leave today. The AI substitute recommender has ranked replacement teachers.`});
  });
  const pendingDocs = data.documents.filter(d=>d.status==="pending").length;
  if(pendingDocs>0) alerts.push({id:"docs", type:"documents", severity:"medium",
    title:`${pendingDocs} admission document${pendingDocs!==1?"s":""} pending verification`,
    detail:"Uploaded documents are waiting for AI extraction review."});
  const overdue = data.students.filter(s=>s.feeStatus==="overdue");
  if(overdue.length>0) alerts.push({id:"fees", type:"fees", severity:"medium",
    title:`Fee payment overdue — ${overdue.length} students`,
    detail:"These students have crossed their fee due date."});
  const lowAtt = data.students.filter(s=>s.attendancePct<75);
  if(lowAtt.length>0) alerts.push({id:"att", type:"attendance", severity:"high",
    title:`${lowAtt.length} students below the 75% attendance threshold`,
    detail:"Consecutive absences are dragging these students' attendance down."});
  const openComplaints = data.complaints.filter(c=>c.status==="Open");
  if(openComplaints.length>0) alerts.push({id:"complaints", type:"complaints", severity:"low",
    title:`${openComplaints.length} complaint${openComplaints.length!==1?"s":""} awaiting assignment`,
    detail:"AI has triaged these by category and priority."});
  const order={critical:0,high:1,medium:2,low:3};
  return alerts.sort((a,b)=>order[a.severity]-order[b.severity]);
}

function atRiskStudents(students){
  return students.map(s=>{
    const reasons=[];
    let worst=null, worstDelta=0;
    Object.entries(s.marks).forEach(([subj,arr])=>{
      const delta = arr[2].score - arr[1].score;
      if(delta < worstDelta){ worstDelta=delta; worst=subj; }
    });
    if(worstDelta<=-10){
      const subName=SUBJECTS.find(x=>x.id===worst).name;
      reasons.push(`${subName} performance declined ${Math.abs(worstDelta)}% between Term 2 and Term 3`);
    }
    if(s.attendancePct<75) reasons.push(`Attendance is at ${s.attendancePct}%, below the 75% threshold`);
    return {...s, atRisk:reasons.length>0, reasons};
  }).filter(s=>s.atRisk);
}

function AdminDashboard({setView}){
  const {data, setData, toast} = useApp();
  const alerts = useMemo(()=>buildAlerts(data),[data]);
  const atRisk = useMemo(()=>atRiskStudents(data.students),[data.students]);
  const totalPendingFees = data.students.reduce((sum,s)=> s.feeStatus!=="paid" ? sum+s.feeDue : sum, 0);
  const avgAttendance = Math.round(data.students.reduce((s,x)=>s+x.attendancePct,0)/data.students.length);
  const attTrend = [
    {day:"Mon",pct:91},{day:"Tue",pct:90},{day:"Wed",pct:88},{day:"Thu",pct:87},{day:"Fri",pct:avgAttendance}
  ];

  function goto(alert){
    if(alert.type==="teacher"||alert.type==="room") setView("timetable");
    else if(alert.type==="substitute") setView("substitutes");
    else if(alert.type==="documents") setView("documents");
    else if(alert.type==="attendance") setView("analytics");
    else if(alert.type==="complaints") setView("complaints");
    else if(alert.type==="fees") setView("students");
  }

  return (
    <>
      <Topbar title="Command Center" sub="What needs your attention right now."/>
      <div className="content">
        <div className="grid stat-grid" style={{marginBottom:20}}>
          <StatCard label="Students" value={data.students.length.toLocaleString()}/>
          <StatCard label="Teachers" value={data.teachers.length}/>
          <StatCard label="Attendance today" value={avgAttendance+"%"} trend={avgAttendance>=85?"Healthy":"Below target"} trendKind={avgAttendance>=85?"up":"down"}/>
          <StatCard label="Fees pending" value={"₹"+totalPendingFees.toLocaleString("en-IN")}/>
          <StatCard label="Documents pending" value={data.documents.filter(d=>d.status==="pending").length}/>
          <StatCard label="At-risk students" value={atRisk.length}/>
        </div>

        <div className="grid" style={{gridTemplateColumns:"1.3fr 1fr", alignItems:"start"}}>
          <div className="card">
            <div className="section-title"><AlertTriangle size={16} color="var(--critical)"/> Priority alert feed</div>
            {alerts.length===0 ? <EmptyState icon={<CheckCircle2 size={30}/>} title="All clear" sub="No operational issues detected right now."/> :
              alerts.map(a=>(
                <div key={a.id} className="alert-row" onClick={()=>goto(a)}>
                  <div className="alert-dot" style={{background:severityColor(a.severity)}}/>
                  <div style={{flex:1}}>
                    <div className="alert-text">{a.title}</div>
                    <div className="alert-sub">{a.detail}</div>
                  </div>
                  <Badge kind={a.severity}>{a.severity}</Badge>
                </div>
              ))
            }
          </div>

          <div style={{display:"flex", flexDirection:"column", gap:16}}>
            <div className="card">
              <div className="section-title"><Sparkles size={15} color="var(--ai)"/> AI insight</div>
              {atRisk.length>0 ? (
                <div style={{fontSize:13, lineHeight:1.6}}>
                  <b>{atRisk.length} student{atRisk.length!==1?"s":""}</b> need attention: {atRisk.slice(0,2).map(s=>s.name).join(", ")}{atRisk.length>2?` +${atRisk.length-2} more`:""}.
                  <div style={{marginTop:8}}><button className="btn btn-ai btn-sm" onClick={()=>setView("analytics")}>View analytics <ChevronRight size={13}/></button></div>
                </div>
              ) : <div style={{fontSize:13, color:"var(--text-dim)"}}>No academic risk signals this week.</div>}
            </div>
            <div className="card">
              <div className="section-title"><TrendingUp size={15}/> Attendance trend</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={attTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="day" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[70,100]} tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip/>
                  <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2.4} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================== STUDENTS ============================== */
function StudentsPage(){
  const {data} = useApp();
  const [q,setQ]=useState(""); const [clsFilter,setClsFilter]=useState("all");
  const [selected,setSelected]=useState(null);
  const filtered = data.students.filter(s=>
    (clsFilter==="all"||s.cls===clsFilter) && s.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
      <Topbar title="Students" sub={`${data.students.length} students across ${CLASSES.length} classes`}/>
      <div className="content">
        <div style={{display:"flex", gap:10, marginBottom:16}}>
          <input className="input" style={{maxWidth:280}} placeholder="Search by name…" value={q} onChange={e=>setQ(e.target.value)}/>
          <select className="input" style={{maxWidth:140}} value={clsFilter} onChange={e=>setClsFilter(e.target.value)}>
            <option value="all">All classes</option>
            {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="card" style={{padding:0}}>
          <table className="dtable">
            <thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Fee status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id} onClick={()=>setSelected(s)} style={{cursor:"pointer"}}>
                  <td><div style={{display:"flex", alignItems:"center", gap:9}}><Avatar name={s.name} size={26}/> {s.name}</div></td>
                  <td>{s.cls}</td>
                  <td>{s.attendancePct}%</td>
                  <td><Badge kind={s.feeStatus==="paid"?"low":s.feeStatus==="pending"?"medium":"critical"}>{s.feeStatus}</Badge></td>
                  <td><ChevronRight size={15} color="var(--text-faint)"/></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0 && <EmptyState icon={<Search size={26}/>} title="No students found" sub="Try a different name or class filter."/>}
        </div>
      </div>
      {selected && <StudentDrawer student={selected} onClose={()=>setSelected(null)}/>}
    </>
  );
}

function StudentDrawer({student, onClose}){
  const avgBySubject = SUBJECTS.map(sub=>({name:sub.id, avg: Math.round(student.marks[sub.id].reduce((a,b)=>a+b.score,0)/3)}));
  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div style={{display:"flex", gap:12, alignItems:"center"}}><Avatar name={student.name} size={44}/>
            <div><div style={{fontWeight:700, fontSize:16}}>{student.name}</div><div style={{fontSize:12.5, color:"var(--text-dim)"}}>Class {student.cls} · Roll {student.rollNo}</div></div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="grid" style={{gridTemplateColumns:"1fr 1fr", marginTop:20, marginBottom:20}}>
          <StatCard label="Attendance" value={student.attendancePct+"%"}/>
          <StatCard label="Fee status" value={student.feeStatus}/>
        </div>
        <div className="section-title" style={{fontSize:13}}>Guardian</div>
        <div style={{fontSize:13, marginBottom:18}}>{student.guardianName}</div>
        <div className="section-title" style={{fontSize:13}}>Subject averages</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={avgBySubject}>
            <XAxis dataKey="name" tick={{fontSize:10.5}} axisLine={false} tickLine={false}/>
            <YAxis domain={[0,100]} tick={{fontSize:10.5}} axisLine={false} tickLine={false}/>
            <Tooltip/>
            <Bar dataKey="avg" fill="var(--primary)" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ============================== TEACHERS ============================== */
function TeachersPage(){
  const {data} = useApp();
  function loadToday(teacherId){
    let count=0;
    CLASSES.forEach(cls=>PERIODS.forEach((p,pi)=>{ const c=data.timetable[cls][TODAY_IDX][pi]; if(c&&c.teacherId===teacherId) count++; }));
    return count;
  }
  function weeklyLoad(teacherId){
    let count=0;
    CLASSES.forEach(cls=>DAYS.forEach((d,di)=>PERIODS.forEach((p,pi)=>{ const c=data.timetable[cls][di][pi]; if(c&&c.teacherId===teacherId) count++; })));
    return count;
  }
  return (
    <>
      <Topbar title="Teachers" sub={`${data.teachers.length} teaching staff`}/>
      <div className="content">
        <div className="card" style={{padding:0}}>
          <table className="dtable">
            <thead><tr><th>Teacher</th><th>Subjects</th><th>Weekly load</th><th>Today</th><th>Status</th></tr></thead>
            <tbody>
              {data.teachers.map(t=>{
                const onLeave = data.teacherLeave.some(l=>l.teacherId===t.id && l.day===TODAY_IDX);
                return (
                  <tr key={t.id}>
                    <td><div style={{display:"flex", alignItems:"center", gap:9}}><Avatar name={t.name} size={26}/> {t.name}</div></td>
                    <td>{t.subjects.map(s=>SUBJECTS.find(x=>x.id===s).name).join(", ")}</td>
                    <td>{weeklyLoad(t.id)} / {t.maxLoad}</td>
                    <td>{loadToday(t.id)} periods</td>
                    <td>{onLeave ? <Badge kind="high">On leave</Badge> : <Badge kind="low">Available</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ============================== ATTENDANCE & MARKS ============================== */
function AttendancePage(){
  const {data, setData, toast, session} = useApp();
  const [cls,setCls]=useState(session.role==="teacher" ? "6A" : "6A");
  const [tab,setTab]=useState("attendance");
  const [subject,setSubject]=useState("MATH");
  const roster = data.students.filter(s=>s.cls===cls);
  const [present,setPresent]=useState(()=>Object.fromEntries(roster.map(s=>[s.id,true])));
  const [scores,setScores]=useState(()=>Object.fromEntries(roster.map(s=>[s.id, s.marks[subject][2].score])));

  useEffect(()=>{
    setPresent(Object.fromEntries(data.students.filter(s=>s.cls===cls).map(s=>[s.id,true])));
    setScores(Object.fromEntries(data.students.filter(s=>s.cls===cls).map(s=>[s.id, s.marks[subject][2].score])));
  },[cls, subject]);

  function saveAttendance(){
    setData(d=>({...d, students:d.students.map(s=>{
      if(s.cls!==cls) return s;
      const wasPresent = present[s.id];
      const delta = wasPresent ? 1 : -2;
      const newPct = Math.max(40, Math.min(100, s.attendancePct + delta*0.4));
      return {...s, attendancePct: Math.round(newPct)};
    })}));
    toast(`Attendance saved for ${cls}`);
  }
  function saveMarks(){
    setData(d=>({...d, students:d.students.map(s=>{
      if(s.cls!==cls) return s;
      const arr=[...s.marks[subject]]; arr[2]={...arr[2], score:Number(scores[s.id])};
      return {...s, marks:{...s.marks, [subject]:arr}};
    })}));
    toast(`Term 3 marks saved for ${cls} · ${SUBJECTS.find(x=>x.id===subject).name}`);
  }

  return (
    <>
      <Topbar title="Attendance & Marks" sub="Mark attendance and record assessment scores."/>
      <div className="content">
        <div style={{display:"flex", gap:10, marginBottom:16}}>
          <select className="input" style={{maxWidth:140}} value={cls} onChange={e=>setCls(e.target.value)}>
            {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {tab==="marks" && (
            <select className="input" style={{maxWidth:200}} value={subject} onChange={e=>setSubject(e.target.value)}>
              {SUBJECTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div className="tabs">
          <div className={`tab ${tab==="attendance"?"active":""}`} onClick={()=>setTab("attendance")}>Mark attendance</div>
          <div className={`tab ${tab==="marks"?"active":""}`} onClick={()=>setTab("marks")}>Enter marks (Term 3)</div>
        </div>
        <div className="card" style={{padding:0}}>
          <table className="dtable">
            <thead><tr><th>Roll</th><th>Student</th>{tab==="attendance" ? <th>Present</th> : <th>Score</th>}</tr></thead>
            <tbody>
              {roster.map(s=>(
                <tr key={s.id}>
                  <td>{s.rollNo}</td>
                  <td>{s.name}</td>
                  <td>
                    {tab==="attendance" ? (
                      <button className="btn btn-sm" style={{background:present[s.id]?"var(--low-tint)":"var(--critical-tint)", color:present[s.id]?"var(--low)":"var(--critical)"}}
                        onClick={()=>setPresent(p=>({...p,[s.id]:!p[s.id]}))}>
                        {present[s.id]?"Present":"Absent"}
                      </button>
                    ) : (
                      <input type="number" className="input" style={{width:80}} value={scores[s.id]} onChange={e=>setScores(sc=>({...sc,[s.id]:e.target.value}))}/>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary" style={{marginTop:14}} onClick={tab==="attendance"?saveAttendance:saveMarks}>
          {tab==="attendance" ? "Save attendance" : "Save marks"}
        </button>
      </div>
    </>
  );
}

/* ============================== TIMETABLE ============================== */
function TimetablePage({readOnlyClass}){
  const {data, setData, toast} = useApp();
  const [cls,setCls]=useState(readOnlyClass || "8B");
  const conflicts = useMemo(()=>detectConflicts(data.timetable, data.teachers),[data.timetable]);
  const classConflicts = conflicts.filter(c=>c.classes.includes(cls));

  function isConflictCell(day, period){
    return classConflicts.some(c=>c.day===day && c.period===period);
  }
  function regenerate(){
    setData(d=>({...d, timetable: generateTimetable(d.teachers, true)}));
    toast("Timetable regenerated — conflict-free");
  }
  function resolve(conflict){
    const {grids, note} = resolveConflict(conflict, data.timetable, data.teachers);
    setData(d=>({...d, timetable:grids}));
    toast(note);
  }

  return (
    <>
      <Topbar title="Timetable" sub="Master schedule with automatic conflict detection."/>
      <div className="content">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <select className="input" style={{maxWidth:140}} value={cls} onChange={e=>setCls(e.target.value)} disabled={!!readOnlyClass}>
            {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {!readOnlyClass && <button className="btn btn-secondary btn-sm" onClick={regenerate}><RefreshCw size={13}/> Regenerate conflict-free</button>}
        </div>

        {!readOnlyClass && conflicts.length>0 && (
          <div className="card" style={{marginBottom:16, borderColor:"var(--critical)"}}>
            <div className="section-title"><AlertTriangle size={15} color="var(--critical)"/> {conflicts.length} conflict{conflicts.length!==1?"s":""} detected</div>
            {conflicts.map(c=>(
              <div key={c.id} className="alert-row">
                <div className="alert-dot" style={{background:severityColor(c.severity)}}/>
                <div style={{flex:1}}><div className="alert-text">{c.title}</div><div className="alert-sub">{c.detail}</div></div>
                <button className="btn btn-secondary btn-sm" onClick={()=>resolve(c)}>Resolve</button>
              </div>
            ))}
          </div>
        )}

        <div className="tt-grid">
          <div className="tt-cell tt-head"></div>
          {PERIODS.map(p=><div key={p.n} className="tt-cell tt-head">P{p.n}<div style={{fontWeight:400, fontSize:10}}>{p.t}</div></div>)}
          {DAYS.map((day,d)=>(
            <>
              <div key={day} className="tt-cell tt-head" style={{textAlign:"left", display:"flex", alignItems:"center"}}>{day}</div>
              {PERIODS.map((per,p)=>{
                const cell=data.timetable[cls][d][p];
                const conflictHere = isConflictCell(d,p);
                if(!cell) return <div key={p} className="tt-cell"/>;
                const sub=SUBJECTS.find(s=>s.id===cell.subject);
                const teacher=data.teachers.find(t=>t.id===cell.teacherId);
                return (
                  <div key={p} className="tt-cell">
                    <div className={`tt-slot ${conflictHere?"tt-conflict":""}`} style={{background:conflictHere?undefined:"var(--surface-2)"}}>
                      <div style={{fontWeight:700}}>{sub.name}</div>
                      <div style={{color:"var(--text-dim)"}}>{teacher.name.split(" ")[0]} {teacher.name.split(" ")[1]?.[0]}.</div>
                      {cell.room && <div style={{color:"var(--text-faint)"}}>{cell.room}</div>}
                    </div>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </>
  );
}

/* ============================== SUBSTITUTES ============================== */
function SubstitutesPage(){
  const {data, setData, toast} = useApp();
  const pendingLeaves = data.teacherLeave.filter(l=>l.status==="pending");
  function approve(teacherId, day, period, cls, subject, substitute){
    setData(d=>{
      const grids = JSON.parse(JSON.stringify(d.timetable));
      grids[cls][day][period] = {...grids[cls][day][period], teacherId: substitute.id, substituted:true};
      return {
        ...d, timetable:grids,
        substitutions:[...d.substitutions, {id:uid("sub"), teacherId, substituteId:substitute.id, day, period, cls}],
        notifications:[...d.notifications, {id:uid("n"), text:`${substitute.name} assigned to cover ${cls} Period ${period+1} (${subject})`, read:false}],
        auditLog:[...d.auditLog, {id:uid("a"), user:"Admin", action:`Approved substitute ${substitute.name} for ${cls} P${period+1}`, ts:"Fri"}],
      };
    });
    toast(`${substitute.name} approved as substitute for ${cls}, Period ${period+1}`);
  }
  function resolveLeave(teacherId){
    setData(d=>({...d, teacherLeave:d.teacherLeave.map(l=>l.teacherId===teacherId?{...l,status:"resolved"}:l)}));
  }
  return (
    <>
      <Topbar title="Substitute Teacher AI" sub="Ranked, explainable substitute recommendations."/>
      <div className="content">
        {pendingLeaves.length===0 && <EmptyState icon={<CheckCircle2 size={30}/>} title="No open substitute requests" sub="All teacher absences are covered."/>}
        {pendingLeaves.map(l=>{
          const teacher = data.teachers.find(t=>t.id===l.teacherId);
          const affected = recommendSubstitute(l.teacherId, l.day, data.timetable, data.teachers, data.students);
          return (
            <div key={l.teacherId} className="card" style={{marginBottom:16}}>
              <div className="section-title"><UserCog size={16}/> {teacher.name} — on leave today</div>
              {affected.length===0 && <div style={{fontSize:13, color:"var(--text-dim)"}}>No periods affected today.</div>}
              {affected.map((a,i)=>(
                <div key={i} style={{padding:"12px 0", borderTop: i>0 ? "1px solid var(--border)" : "none"}}>
                  <div style={{fontWeight:700, fontSize:13.5, marginBottom:8}}>{a.cls} · Period {a.period+1} · {a.subject}</div>
                  {a.candidates.length===0 ? <div style={{fontSize:12.5, color:"var(--critical)"}}>No qualified free teacher available for this slot.</div> :
                    <div style={{display:"flex", flexDirection:"column", gap:8}}>
                      {a.candidates.slice(0,2).map((c,ci)=>(
                        <div key={c.id} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--surface-2)", borderRadius:9, padding:"9px 12px"}}>
                          <div>
                            <div style={{fontWeight:700, fontSize:13}}>{c.name} {ci===0 && <Badge kind="ai">Recommended</Badge>}</div>
                            <div style={{fontSize:11.5, color:"var(--text-dim)", marginTop:3}}>{c.reasons.join(" · ")}</div>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={()=>approve(l.teacherId, l.day, a.period, a.cls, a.subject, c)}>Approve</button>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>resolveLeave(l.teacherId)}>Dismiss request</button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ============================== DOCUMENTS ============================== */
function DocumentsPage(){
  const {data, setData, toast} = useApp();
  const [active,setActive]=useState(null);
  const [processing,setProcessing]=useState(false);
  const [editFields,setEditFields]=useState(null);

  function openDoc(doc){ setActive(doc); setEditFields(doc.fields.map(f=>({...f}))); }
  function uploadSample(){
    // Demo AI mode: simulate an incoming document from the local template pool
    const templates = seedDocuments();
    const t = templates[data.documents.length % templates.length];
    const newDoc = {...t, id:uid("doc"), status:"pending"};
    setProcessing(true);
    setTimeout(()=>{
      setData(d=>({...d, documents:[...d.documents, newDoc]}));
      setProcessing(false);
      toast("Document processed — Demo AI mode");
    }, 900);
  }
  function approve(){
    setData(d=>({
      ...d,
      documents:d.documents.map(x=>x.id===active.id?{...x, status:"verified", fields:editFields}:x),
      students: active.type==="Admission Form" ? [...d.students, {
        id:uid("stu"), name: editFields.find(f=>f.key==="Student Name")?.value || "New Student",
        cls: editFields.find(f=>f.key==="Class Applying For")?.value || "6A", rollNo: 16,
        attendancePct:100, marks:Object.fromEntries(SUBJECTS.map(s=>[s.id,[{term:"Term 1",score:70},{term:"Term 2",score:70},{term:"Term 3",score:70}]])),
        feeStatus:"pending", feeDue:5000, guardianName:"—"
      }] : d.students,
      auditLog:[...d.auditLog, {id:uid("a"), user:"Admin", action:`Approved document ${active.id} (${active.type})`, ts:"Fri"}],
    }));
    toast(active.type==="Admission Form" ? "Approved — student record created" : "Document approved and saved");
    setActive(null);
  }
  function reject(){
    setData(d=>({...d, documents:d.documents.map(x=>x.id===active.id?{...x,status:"rejected"}:x)}));
    toast("Document rejected");
    setActive(null);
  }

  const pending = data.documents.filter(d=>d.status==="pending");
  const history = data.documents.filter(d=>d.status!=="pending");

  return (
    <>
      <Topbar title="AI Document Reader" sub="Upload → OCR → Extract → Verify → Save to database"/>
      <div className="content">
        <div className="card" style={{marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700, fontSize:14}}>Upload a document</div>
            <div style={{fontSize:12.5, color:"var(--text-dim)"}}>No AI provider key configured — running in <Badge kind="ai">Demo AI mode</Badge> with deterministic extraction.</div>
          </div>
          <button className="btn btn-primary" onClick={uploadSample} disabled={processing}>
            {processing ? <><Loader2 size={14} className="spin"/> Processing…</> : <><Upload size={14}/> Upload document</>}
          </button>
        </div>

        <div className="section-title">Pending review ({pending.length})</div>
        {pending.length===0 ? <EmptyState icon={<FileText size={26}/>} title="No documents awaiting review" sub="Upload a document to see the AI extraction pipeline."/> : (
          <div className="grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", marginBottom:26}}>
            {pending.map(d=>(
              <div key={d.id} className="card" style={{cursor:"pointer"}} onClick={()=>openDoc(d)}>
                <div style={{display:"flex", justifyContent:"space-between"}}><Badge kind="primary">{d.type}</Badge><Badge kind="neutral">pending</Badge></div>
                <div style={{fontWeight:700, marginTop:10, fontSize:13.5}}>{d.fields[0].value}</div>
                <div style={{fontSize:11.5, color:"var(--text-dim)", marginTop:2}}>{d.fileName}</div>
              </div>
            ))}
          </div>
        )}

        {history.length>0 && (
          <>
            <div className="section-title">History</div>
            <div className="card" style={{padding:0}}>
              <table className="dtable">
                <thead><tr><th>Type</th><th>File</th><th>Status</th></tr></thead>
                <tbody>{history.map(d=>(
                  <tr key={d.id}><td>{d.type}</td><td>{d.fileName}</td><td><Badge kind={d.status==="verified"?"low":"critical"}>{d.status}</Badge></td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {active && (
        <div className="modal-overlay" onClick={()=>setActive(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
              <div style={{fontWeight:700, fontSize:15.5}}>{active.type}</div>
              <button className="icon-btn" onClick={()=>setActive(null)}><X size={15}/></button>
            </div>
            <div style={{fontSize:12, color:"var(--text-dim)", marginBottom:16}}>{active.fileName} · <Badge kind="ai">AI extracted</Badge></div>
            {editFields.map((f,i)=>(
              <div key={f.key} style={{marginBottom:12}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
                  <label className="field-label" style={{marginBottom:0}}>{f.key}</label>
                  <span style={{fontSize:11, color: f.confidence<70?"var(--critical)":"var(--text-dim)", fontWeight:700}}>{f.confidence}% confidence</span>
                </div>
                <input className="input" value={f.value} onChange={e=>setEditFields(fs=>fs.map((x,xi)=>xi===i?{...x,value:e.target.value}:x))}/>
                <div style={{marginTop:4}}><ConfBar value={f.confidence}/></div>
                {f.confidence<70 && <div style={{fontSize:11, color:"var(--critical)", marginTop:3, display:"flex", gap:4, alignItems:"center"}}><Info size={11}/> Low confidence — please verify against the original document.</div>}
              </div>
            ))}
            <div style={{display:"flex", gap:10, marginTop:18}}>
              <button className="btn btn-primary" onClick={approve}><CheckCircle2 size={14}/> Approve & save</button>
              <button className="btn btn-danger" onClick={reject}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================== ANALYTICS ============================== */
function AnalyticsPage(){
  const {data} = useApp();
  const atRisk = useMemo(()=>atRiskStudents(data.students),[data.students]);
  const classAvg = CLASSES.map(cls=>{
    const studs = data.students.filter(s=>s.cls===cls);
    const avg = Math.round(studs.reduce((sum,s)=>{
      const subAvg = Object.values(s.marks).reduce((a,arr)=>a+arr[2].score,0)/SUBJECTS.length;
      return sum+subAvg;
    },0)/studs.length);
    return {cls, avg};
  });
  return (
    <>
      <Topbar title="Academic Performance Analytics" sub="AI-identified risk signals across the school."/>
      <div className="content">
        <div className="card" style={{marginBottom:18}}>
          <div className="section-title">Class average (Term 3)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classAvg}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="cls" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip/>
              <Bar dataKey="avg" fill="var(--primary)" radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title"><Sparkles size={15} color="var(--ai)"/> AI-flagged at-risk students ({atRisk.length})</div>
          {atRisk.length===0 ? <EmptyState icon={<CheckCircle2 size={26}/>} title="No students currently flagged" sub="Every student is tracking within normal ranges."/> :
            atRisk.map(s=>(
              <div key={s.id} className="alert-row" style={{cursor:"default"}}>
                <div className="alert-dot" style={{background:"var(--critical)"}}/>
                <div style={{flex:1}}>
                  <div className="alert-text">{s.name} · {s.cls}</div>
                  <div className="alert-sub">{s.reasons.join(" — ")}</div>
                </div>
                <Badge kind="critical">AI Risk</Badge>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
}

/* ============================== COMPLAINTS ============================== */
function ComplaintsPage(){
  const {data, setData, toast} = useApp();
  const [text,setText]=useState("");
  function submit(){
    if(!text.trim()) return;
    const {category, priority} = triage(text);
    setData(d=>({...d, complaints:[{id:uid("c"), text, category, priority, status:"Open", by:"Admin (manual entry)", date:"Today"}, ...d.complaints]}));
    setText("");
    toast(`AI categorized as ${category} · ${priority} priority`);
  }
  function resolveC(id){ setData(d=>({...d, complaints:d.complaints.map(c=>c.id===id?{...c,status:"Resolved"}:c)})); }
  return (
    <>
      <Topbar title="Complaints" sub="AI automatically categorizes and prioritizes every submission."/>
      <div className="content">
        <div className="card" style={{marginBottom:18}}>
          <div className="section-title">Submit a complaint</div>
          <textarea className="input" rows={3} placeholder="Describe the issue…" value={text} onChange={e=>setText(e.target.value)}/>
          <button className="btn btn-primary" style={{marginTop:10}} onClick={submit}><Sparkles size={13}/> Submit & triage</button>
        </div>
        <div className="card" style={{padding:0}}>
          <table className="dtable">
            <thead><tr><th>Complaint</th><th>Category</th><th>Priority</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.complaints.map(c=>(
                <tr key={c.id}>
                  <td style={{maxWidth:340}}>{c.text}<div style={{fontSize:11, color:"var(--text-faint)"}}>{c.by}</div></td>
                  <td><Badge kind="primary">{c.category}</Badge></td>
                  <td><Badge kind={c.priority==="Critical"?"critical":c.priority==="High"?"high":c.priority==="Medium"?"medium":"low"}>{c.priority}</Badge></td>
                  <td><Badge kind={c.status==="Open"?"neutral":"low"}>{c.status}</Badge></td>
                  <td>{c.status==="Open" && <button className="btn btn-ghost btn-sm" onClick={()=>resolveC(c.id)}>Resolve</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ============================== QUESTION PAPER GENERATOR ============================== */
function QuestionPaperPage(){
  const {toast} = useApp();
  const [subject,setSubject]=useState("MATH");
  const chapters = Object.keys(QUESTION_BANK[subject]||{});
  const [chapter,setChapter]=useState(chapters[0]);
  const [paper,setPaper]=useState(null);
  useEffect(()=>{ const ch=Object.keys(QUESTION_BANK[subject]||{}); setChapter(ch[0]); },[subject]);

  function generate(){
    const bank = QUESTION_BANK[subject]?.[chapter];
    if(!bank){ toast("No question bank available for that chapter yet."); return; }
    setPaper({
      subject:SUBJECTS.find(s=>s.id===subject).name, chapter,
      mcq: bank.mcq, short: bank.short, long: bank.long,
    });
  }
  return (
    <>
      <Topbar title="AI Question Paper Generator" sub="Build a paper from class, subject and chapter."/>
      <div className="content">
        <div className="card" style={{marginBottom:18, display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap"}}>
          <div><label className="field-label">Subject</label>
            <select className="input" value={subject} onChange={e=>setSubject(e.target.value)}>
              {Object.keys(QUESTION_BANK).map(s=><option key={s} value={s}>{SUBJECTS.find(x=>x.id===s).name}</option>)}
            </select>
          </div>
          <div><label className="field-label">Chapter</label>
            <select className="input" value={chapter} onChange={e=>setChapter(e.target.value)}>
              {chapters.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate}><Wand2 size={14}/> Generate paper</button>
        </div>
        {paper && (
          <div className="card">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div className="section-title" style={{marginBottom:0}}>{paper.subject} — {paper.chapter}</div>
              <button className="btn btn-secondary btn-sm" onClick={()=>window.print()}><Printer size={13}/> Print / export</button>
            </div>
            <div style={{marginTop:14}}>
              <b style={{fontSize:12.5}}>Section A — MCQ (1 mark each)</b>
              <ol style={{fontSize:13, lineHeight:1.9}}>{paper.mcq.map((q,i)=><li key={i}>{q}</li>)}</ol>
              <b style={{fontSize:12.5}}>Section B — Short answer (3 marks each)</b>
              <ol style={{fontSize:13, lineHeight:1.9}}>{paper.short.map((q,i)=><li key={i}>{q}</li>)}</ol>
              <b style={{fontSize:12.5}}>Section C — Long answer (5 marks each)</b>
              <ol style={{fontSize:13, lineHeight:1.9}}>{paper.long.map((q,i)=><li key={i}>{q}</li>)}</ol>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================== AI ASSISTANT ============================== */
function answerQuestion(q, data){
  const t=q.toLowerCase();
  const used=[];
  if(/free.*(room|classroom|lab)|lab.*free/.test(t)){
    used.push("Timetable");
    const busy=new Set();
    CLASSES.forEach(cls=>PERIODS.forEach((p,pi)=>{ const c=data.timetable[cls][TODAY_IDX][pi]; if(c&&c.room) busy.add(c.room+"-P"+pi); }));
    const free=[];
    LABS.forEach(l=>PERIODS.forEach((p,pi)=>{ if(!busy.has(l+"-P"+pi)) free.push(`${l} at Period ${pi+1}`); }));
    return {text: free.length ? `Free labs today: ${free.slice(0,5).join(", ")}${free.length>5?"…":""}.` : "No labs are free today.", used};
  }
  if(/attendance.*below|below.*attendance|attendance.*75/.test(t)){
    used.push("Students","Attendance");
    const list = data.students.filter(s=>s.attendancePct<75);
    return {text: list.length ? `${list.length} students are below 75% attendance: ${list.slice(0,6).map(s=>`${s.name} (${s.attendancePct}%)`).join(", ")}${list.length>6?"…":""}.` : "No students are currently below 75% attendance.", used};
  }
  if(/fee/.test(t)){
    used.push("Students","Fees");
    const pending = data.students.filter(s=>s.feeStatus!=="paid");
    const total = pending.reduce((s,x)=>s+x.feeDue,0);
    return {text: `₹${total.toLocaleString("en-IN")} is pending across ${pending.length} students (${data.students.filter(s=>s.feeStatus==="overdue").length} overdue).`, used};
  }
  if(/teacher.*absent|absent.*today|who.*leave/.test(t)){
    used.push("Teachers","Leave");
    const list = data.teacherLeave.filter(l=>l.day===TODAY_IDX).map(l=>data.teachers.find(t=>t.id===l.teacherId).name);
    return {text: list.length ? `Teachers absent today: ${list.join(", ")}.` : "No teachers are absent today.", used};
  }
  if(/conflict/.test(t)){
    used.push("Timetable");
    const conflicts = detectConflicts(data.timetable, data.teachers);
    return {text: conflicts.length ? `${conflicts.length} conflict(s): ${conflicts.map(c=>c.title).join(" | ")}` : "No timetable conflicts right now.", used};
  }
  if(/document.*pending|pending.*verif/.test(t)){
    used.push("Documents");
    const n = data.documents.filter(d=>d.status==="pending").length;
    return {text: `${n} documents are waiting for verification.`, used};
  }
  if(/substitute/.test(t)){
    used.push("Timetable","Teachers","Leave");
    const l = data.teacherLeave.find(x=>x.status==="pending");
    if(!l) return {text:"No teachers are currently on unresolved leave.", used};
    const teacher = data.teachers.find(x=>x.id===l.teacherId);
    const rec = recommendSubstitute(l.teacherId, l.day, data.timetable, data.teachers, data.students);
    if(!rec.length) return {text:`${teacher.name} has no periods affected today.`, used};
    const top = rec[0];
    return {text: `For ${teacher.name}'s ${top.subject} class (${top.cls}, Period ${top.period+1}), the best substitute is ${top.candidates[0]?.name || "no one currently free"}.`, used};
  }
  if(/at.?risk|declin|attention|struggling/.test(t)){
    used.push("Students","Marks","Attendance");
    const list = atRiskStudents(data.students);
    if(!list.length) return {text:"No students currently need immediate attention.", used};
    return {text: list.slice(0,4).map(s=>`${s.name} (${s.cls}) — ${s.reasons.join("; ")}`).join(" | "), used};
  }
  return {text:"I can answer questions about free rooms, attendance, fees, absent teachers, timetable conflicts, pending documents, substitutes, and at-risk students — try one of the suggestions below.", used:[]};
}

function AssistantPage(){
  const {data} = useApp();
  const [messages,setMessages]=useState([{role:"ai", text:"Ask me anything about today's school operations — I answer using live seeded data."}]);
  const [input,setInput]=useState("");
  const suggestions=["Which classrooms are free tomorrow?","Which students have attendance below 75%?","How much fee is pending?","Which teachers are absent today?","Which classes have timetable conflicts?","Which students currently need immediate attention and why?"];
  function ask(text){
    if(!text.trim()) return;
    const {text:answer, used} = answerQuestion(text, data);
    setMessages(m=>[...m, {role:"user", text}, {role:"ai", text:answer, used}]);
    setInput("");
  }
  return (
    <>
      <Topbar title="AI Admin Assistant" sub="Natural-language answers grounded in your school's live data."/>
      <div className="content">
        <div className="chat-wrap">
          {messages.map((m,i)=>(
            <div key={i} className={`chat-row ${m.role==="user"?"user":"ai"}`}>
              <div className={`chat-bubble ${m.role==="user"?"chat-user":"chat-ai"}`}>{m.text}</div>
              {m.used && m.used.length>0 && <div style={{marginTop:5, display:"flex", gap:5}}>{m.used.map(u=><Badge key={u} kind="neutral">{u}</Badge>)}</div>}
            </div>
          ))}
        </div>
        <div style={{display:"flex", flexWrap:"wrap", gap:8, margin:"18px 0"}}>
          {suggestions.map(s=><div key={s} className="suggest-chip" onClick={()=>ask(s)}>{s}</div>)}
        </div>
        <div style={{display:"flex", gap:8, maxWidth:760}}>
          <input className="input" placeholder="Type a question…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") ask(input);}}/>
          <button className="btn btn-primary" onClick={()=>ask(input)}><Send size={14}/></button>
        </div>
      </div>
    </>
  );
}

/* ============================== TEACHER / FAMILY VIEWS ============================== */
function TeacherDashboard(){
  const {data, session} = useApp();
  const teacherId=session.teacherId || data.teachers[0].id;
  const todaysClasses=[];
  CLASSES.forEach(cls=>PERIODS.forEach((p,pi)=>{ const c=data.timetable[cls][TODAY_IDX][pi]; if(c&&c.teacherId===teacherId) todaysClasses.push({cls,period:pi+1,subject:SUBJECTS.find(s=>s.id===c.subject).name}); }));
  return (
    <>
      <Topbar title="Today" sub="Friday's schedule and quick actions."/>
      <div className="content">
        <div className="card">
          <div className="section-title"><CalendarClock size={16}/> Your classes today</div>
          {todaysClasses.length===0 ? <EmptyState icon={<CalendarClock size={26}/>} title="No classes today" sub=""/> :
            todaysClasses.sort((a,b)=>a.period-b.period).map((c,i)=>(
              <div key={i} className="alert-row" style={{cursor:"default"}}>
                <Clock size={15} color="var(--primary)" style={{marginTop:2}}/>
                <div style={{flex:1}}><div className="alert-text">Period {c.period} · {c.subject}</div><div className="alert-sub">Class {c.cls}</div></div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
}

function FamilyDashboard(){
  const {data, session} = useApp();
  const student = data.students.find(s=>s.id===session.studentId) || data.students[0];
  return (
    <>
      <Topbar title={session.role==="parent"?`${student.name}'s summary`:"My dashboard"} sub={`Class ${student.cls} · Roll ${student.rollNo}`}/>
      <div className="content">
        <div className="grid stat-grid">
          <StatCard label="Attendance" value={student.attendancePct+"%"}/>
          <StatCard label="Fee status" value={student.feeStatus}/>
          <StatCard label="Overall average" value={Math.round(Object.values(student.marks).reduce((a,arr)=>a+arr[2].score,0)/SUBJECTS.length)+"%"}/>
        </div>
      </div>
    </>
  );
}
function FamilyMarks(){
  const {data, session} = useApp();
  const student = data.students.find(s=>s.id===session.studentId) || data.students[0];
  return (
    <>
      <Topbar title="Marks" sub={student.name}/>
      <div className="content">
        <div className="card" style={{padding:0}}>
          <table className="dtable">
            <thead><tr><th>Subject</th><th>Term 1</th><th>Term 2</th><th>Term 3</th></tr></thead>
            <tbody>{SUBJECTS.map(s=>(
              <tr key={s.id}><td>{s.name}</td>{student.marks[s.id].map((m,i)=><td key={i}>{m.score}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
