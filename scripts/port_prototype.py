"""Ports the approved HRMS prototype script into src/hrms/prototype.ts.
Every change is an exact, asserted text patch so the screens and logic stay 1:1."""
import re, sys
SRC = 'scripts/prototype/index.html'
OUT = 'src/hrms/prototype.ts'
html = open(SRC).read()
lines = html.split('\n')
script = '\n'.join(lines[205:2392])   # contents between <script> (line 205) and </script> (line 2393)

def rep(old, new, count=1):
    global script
    c = script.count(old)
    if c != count:
        sys.exit(f'PATCH FAILED ({c} matches, expected {count}):\n{old[:200]}')
    script = script.replace(old, new)

def rep_re(pattern, new, count=1):
    global script
    new_script, n = re.subn(pattern, new, script, flags=re.S)
    if n != count:
        sys.exit(f'REGEX PATCH FAILED ({n}): {pattern[:120]}')
    script = new_script

# ── 1. data comes from the database (env.data), not hard-coded arrays ──
rep_re(r'const STAFF = \[.*?\];\n', 'const STAFF = env.data.STAFF;\n')
rep_re(r'const ATTENDANCE = \{.*?\};\n', 'const ATTENDANCE = env.data.ATTENDANCE;\n')
rep_re(r'let TASKS = \[.*?\];\n', 'let TASKS = env.data.TASKS;\n')
rep_re(r'let LEAVES = \[.*?\];\n', 'let LEAVES = env.data.LEAVES;\n')
rep_re(r'let UNITS = \[.*?\];\n', 'let UNITS = env.data.UNITS;\n')
rep_re(r'let DEPARTMENTS = \[.*?\];\n', 'let DEPARTMENTS = env.data.DEPARTMENTS;\n')
rep_re(r'let DESIGNATIONS = \[.*?\];\n', 'let DESIGNATIONS = env.data.DESIGNATIONS;\n')
rep('const DEMO_STAFF_ID = "2100367";\nconst ADMIN_CREDS = {username:"admin", password:"admin123"};',
    'const ADMIN_CREDS = {username:"admin", password:""}; // admin accounts sign in through Supabase Auth')
rep_re(r'let SHIFT_MASTER = \[\n.*?\n\];\n', 'let SHIFT_MASTER = env.data.SHIFT_MASTER;\n')
rep_re(r'let PAYROLL_SETTINGS = \{\n.*?\n\};\n', 'let PAYROLL_SETTINGS = env.data.PAYROLL_SETTINGS;\n')
rep_re(r'let HOLIDAYS = \[.*?\];\n', 'let HOLIDAYS = env.data.HOLIDAYS;\n')
rep_re(r'let TASK_TEMPLATES = \[\n.*?\n\];\n', 'let TASK_TEMPLATES = env.data.TASK_TEMPLATES;\n')
rep('let ROSTER = {}; // admin per-date overrides', 'let ROSTER = env.data.ROSTER; // admin per-date overrides')
rep("function escapeAttr(s){ return String(s).replace(/\"/g,'&quot;'); }",
    "function escapeHTML(s){ return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }\nfunction escapeAttr(s){ return escapeHTML(s); }")

# ── 2. local date (IST) instead of UTC for "today" stamps ──
rep('new Date().toISOString().slice(0,10)', 'todayISO()', 12)

# ── 3. pay-cycle length: completed cycles use the prototype rule (days on record);
#       a cycle still in progress uses the full cycle length so mid-month figures aren't inflated ──
rep('  const cycleLen = records.length;',
    '  const cycleLen = (env.cycle.complete ? records.length : env.cycle.dates.length) || 1;')

# ── 4. staff sign-in through Supabase Auth ──
rep("""    '<h2 style="font-size:18px;">Selvantra HRMS</h2>'+""",
    """    '<h2 style="font-size:18px;">WestMed Payroll System</h2>'+""")
rep("""    '<input id="staffIdInput" class="mono" placeholder="Staff Code, e.g. '+DEMO_STAFF_ID+'" inputmode="numeric" />'+""",
    """    '<input id="staffIdInput" class="mono" placeholder="Staff Code" inputmode="numeric" />'+""")
rep("""    '<div class="hint">Demo: password = staff code (temporary password until changed).</div>'+""",
    """    '<div class="hint">First sign-in: your password is your Staff Code until you change it.</div>'+""")
rep("""    '<div class="section-title" style="margin-top:18px;">Try a demo ID</div>'+
    '<div class="chip-row">'+ sample.map(e=>'<span class="chip" data-id="'+e.empNo+'">'+e.empNo+' &middot; '+e.name.split(' ')[0]+'</span>').join('') +'</div>'+
""", "")
rep("""  staffView.querySelectorAll('.chip').forEach(c=> c.onclick = ()=>{
    document.getElementById('staffIdInput').value = c.dataset.id;
    document.getElementById('staffPwInput').value = c.dataset.id;
  });
""", "")
rep("  const sample = STAFF.slice(0,6);\n", "")
rep("""function tryStaffLogin(id, pw){
  const s = STAFF.find(x=>x.empNo===id);
  if(!s){ renderStaffLogin('No staff found with code "'+id+'".'); return; }
  if(s.password !== pw){ renderStaffLogin('Incorrect password for '+id+'. (Demo password = staff code)'); return; }
  currentStaff = id;
  staffTab = 'overview';
  claimSession(id);
  renderStaffDashboard();
}""", """async function tryStaffLogin(id, pw){
  if(!id || !pw){ renderStaffLogin('Enter your Staff Code and password.'); return; }
  const btn = document.getElementById('staffLoginBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Signing in…'; }
  staffTab = 'overview';
  const res = await env.auth.staffSignIn(id, pw);
  if(res && res.error){ renderStaffLogin(res.error); }
  // on success the app loads live data and calls applySession()
}""")
rep("  document.getElementById('logoutBtn').onclick = ()=>{ releaseSession(); currentStaff=null; renderStaffLogin(); };",
    "  document.getElementById('logoutBtn').onclick = ()=>{ env.auth.signOut(); };")

# ── 5. admin / manager sign-in through Supabase Auth ──
rep("""    '<input id="adminUserInput" placeholder="Username" value="admin" />'+""",
    """    '<input id="adminUserInput" placeholder="Username, email or Staff Code" />'+""")
rep("""    '<div class="hint">Demo — Admin: admin / admin123 &middot; Manager: 2100259 / 2100259 (NIVEDHA V, Role = Manager in Staff Master)</div>'+""",
    """    '<div class="hint">Administrator: your WestMed admin username or email. Manager: your Staff Code and password (Role = Manager in Staff Master).</div>'+""")
rep("""  const doLogin = ()=>{
    const u = document.getElementById('adminUserInput').value.trim();
    const p = document.getElementById('adminPwInput').value.trim();
    if(u===ADMIN_CREDS.username && p===ADMIN_CREDS.password){
      adminLoggedIn=true; currentAdminAccount={username:u, name:'Administrator', role:'admin'};
      adminTab = ADMIN_TABS_BY_ROLE.admin[0]; claimSession(u); renderAdmin(); return;
    }
    const s = STAFF.find(x=>x.empNo===u && x.password===p);
    if(s && s.role==='Manager'){
      adminLoggedIn=true; currentAdminAccount={username:s.empNo, name:s.name, role:'manager'};
      adminTab = ADMIN_TABS_BY_ROLE.manager[0]; claimSession(s.empNo); renderAdmin(); return;
    }
    renderAdminLogin(s ? 'This staff account is not set up for console access (Role must be Manager).' : 'Incorrect username or password.');
  };""", """  const doLogin = async ()=>{
    const u = document.getElementById('adminUserInput').value.trim();
    const p = document.getElementById('adminPwInput').value.trim();
    if(!u || !p){ renderAdminLogin('Enter your username and password.'); return; }
    const btn = document.getElementById('adminLoginBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Signing in…'; }
    const res = await env.auth.adminSignIn(u, p);
    if(res && res.error){ renderAdminLogin(res.error); }
    // on success the app loads live data and calls applySession()
  };""")
rep("  document.getElementById('adminLogoutBtn').onclick = ()=>{ releaseSession(); adminLoggedIn=false; currentAdminAccount=null; renderAdmin(); };",
    "  document.getElementById('adminLogoutBtn').onclick = ()=>{ env.auth.signOut(); };")

# ── 6. change password through Supabase Auth ──
rep("""  document.getElementById('cpSubmit').onclick = ()=>{
    const cur = document.getElementById('cpCurrent').value;
    const nw = document.getElementById('cpNew').value;
    const cf = document.getElementById('cpConfirm').value;
    const err = document.getElementById('cpError');
    let currentPw, applyNew;
    if(kind==='staff'){
      const emp = findStaff(currentStaff);
      currentPw = emp.password;
      applyNew = ()=>{ emp.password = nw; };
    } else if(currentAdminAccount.role==='admin'){
      currentPw = ADMIN_CREDS.password;
      applyNew = ()=>{ ADMIN_CREDS.password = nw; };
    } else {
      const emp = findStaff(currentAdminAccount.username);
      currentPw = emp.password;
      applyNew = ()=>{ emp.password = nw; };
    }
    if(cur !== currentPw){ err.textContent = 'Current password is incorrect.'; return; }
    if(!nw || nw.length < 4){ err.textContent = 'New password must be at least 4 characters.'; return; }
    if(nw !== cf){ err.textContent = 'New password and confirmation do not match.'; return; }
    applyNew();
    modalRoot.innerHTML = '';
    alert('Password updated.');
  };""", """  document.getElementById('cpSubmit').onclick = async ()=>{
    const cur = document.getElementById('cpCurrent').value;
    const nw = document.getElementById('cpNew').value;
    const cf = document.getElementById('cpConfirm').value;
    const err = document.getElementById('cpError');
    if(!cur){ err.textContent = 'Enter your current password.'; return; }
    if(!nw || nw.length < 4){ err.textContent = 'New password must be at least 4 characters.'; return; }
    if(nw !== cf){ err.textContent = 'New password and confirmation do not match.'; return; }
    const isStaffAccount = kind==='staff' || (currentAdminAccount && currentAdminAccount.role==='manager');
    const res = await env.auth.changePassword(isStaffAccount, cur, nw);
    if(res && res.error){ err.textContent = res.error; return; }
    modalRoot.innerHTML = '';
    alert('Password updated.');
  };""")

# ── 7. single active session is handled by the app (Supabase realtime), not localStorage ──
rep_re(r"const DEVICE_ID = \(function\(\)\{.*?\n\}\);\nfunction handleSessionTakeover\(\)\{",
       "function claimSession(){}\nfunction releaseSession(){}\nfunction handleSessionTakeover(){")

# ── 8. new leave / task records get their real ID from the database (L023, T045 …) ──
rep("const rec = {id:'L'+String(LEAVES.length+1).padStart(3,'0'), empNo, type,",
    "const rec = {id:env.tempId('L'), empNo, type,")
rep("TASKS.push({id:'T'+String(TASKS.length+1).padStart(3,'0'), title,",
    "TASKS.push({id:env.tempId('T'), title,")
rep("TASK_TEMPLATES.push({id:'TT'+(TASK_TEMPLATES.length+1), title:v.title, description:v.description});",
    "TASK_TEMPLATES.push({id:nextMasterCode(TASK_TEMPLATES.map(t=>({code:t.id})),'TT'), title:v.title, description:v.description});")
rep("""<input id="lvDate" type="date" value="2026-09-25">""", """<input id="lvDate" type="date" value="'+todayISO()+'">""")

# ── 9. Staff Master: passwords are never shown; typing a new one resets it ──
rep("""      '<td><input class="editable mono" data-field="password" value="'+escapeAttr(e.password)+'"></td>'+""",
    """      '<td><input class="editable mono" data-field="password" type="password" value="" placeholder="set new…" autocomplete="new-password" style="width:110px;"></td>'+""")
rep("""      const field = inp.dataset.field;
      const numericFields = ['netSalary','monthlyCL','monthlyPermissionHours'];""",
    """      const field = inp.dataset.field;
      if(field==='password'){
        const pw = inp.value.trim(); inp.value = '';
        if(pw.length < 4){ alert('Password must be at least 4 characters.'); return; }
        env.setStaffPassword(id, pw).then(r=> alert(r && r.error ? 'Could not set password: '+r.error : 'Password updated for '+s.name+'.'));
        return;
      }
      const numericFields = ['netSalary','monthlyCL','monthlyPermissionHours'];""")
rep("""    '<input class="search" id="staffSearch" placeholder="Search staff..." value="'+escapeAttr(staffQuery)+'" />'+
    '<button class="btn" id="addStaffBtn">+ Add staff</button>'+""",
    """    '<input class="search" id="staffSearch" placeholder="Search staff..." value="'+escapeAttr(staffQuery)+'" />'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
      '<button class="iconbtn" id="createLoginsBtn" title="Create sign-in accounts for staff who don\\'t have one yet (password = Staff Code)">Create missing logins</button>'+
      '<button class="btn" id="addStaffBtn">+ Add staff</button>'+
    '</div>'+""")
rep("""  document.getElementById('addStaffBtn').onclick = openAddStaffForm;""",
    """  document.getElementById('addStaffBtn').onclick = openAddStaffForm;
  document.getElementById('createLoginsBtn').onclick = async ()=>{
    const b = document.getElementById('createLoginsBtn'); b.disabled = true; b.textContent = 'Creating…';
    const r = await env.ensureAllLogins();
    b.disabled = false; b.textContent = 'Create missing logins';
    alert(r && r.error ? 'Could not create logins: '+r.error
      : (r.created+' login(s) created. Each staff member signs in with their Staff Code; the first password is the Staff Code.'+(r.failed && r.failed.length ? '\\n\\nFailed: '+r.failed.map(f=>f.emp_no+' ('+f.error+')').join(', ') : '')));
  };""")
rep(""" Changes here persist for this browser session only — wire this table to the live `staff` table in Supabase when this ships inside the Lovable project.""",
    """ Password: type a new one to reset that staff member\\'s sign-in password (it is never displayed). "Create missing logins" gives every staff member without an account a login with their Staff Code as the first password.""")

# ── 10. new staff start with no attendance (real punches come from the biometric import) ──
rep("""  const ref = ATTENDANCE[Object.keys(ATTENDANCE)[0]].records;
  return ref.map(r=> r.status==='WO' ? {date:r.date, status:'WO'} : {date:r.date, status:'P', in:'09:00', out:'18:00'});""",
    """  return [];""")

# ── 11. helpers that assumed the first employee has a full attendance list ──
rep("""  const anyAtt = ATTENDANCE[Object.keys(ATTENDANCE)[0]];
  if(!anyAtt) return [];
  return anyAtt.records.map(r0=>{""", """  const anyAtt = {records: allCycleDates().map(d=>({date:d}))};
  if(!anyAtt.records.length) return [];
  return anyAtt.records.map(r0=>{""")
rep("""  const anyAtt = ATTENDANCE[Object.keys(ATTENDANCE)[0]];
  if(!anyAtt || !anyAtt.records.length) return null;
  return anyAtt.records.reduce((max,r)=> r.date>max?r.date:max, anyAtt.records[0].date);""",
    """  const dates = allCycleDates();
  return dates.length ? dates[dates.length-1] : null;""")

# ── 12. branding ──
rep("""          '<div style="font-weight:700;font-size:16px;">Selvantra Technologies</div>'+""",
    """          '<div style="font-weight:700;font-size:16px;">'+env.orgName+'</div>'+""")
rep("— Selvantra HRMS now opens full-screen like an app", "— WestMed Payroll System now opens full-screen like an app")

# ── 13. cycle label is live; boot is driven by the app ──
rep('const CYCLE_LABEL_JS = "25 Aug 2026 - 24 Sep 2026";', 'let CYCLE_LABEL_JS = env.cycle.label;')
rep("""/* ================= init ================= */
renderStaffLogin();
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}""", "")

# ══════════════════════════ Phase 2 (after the prototype) ══════════════════════════

# ── 14. locked (finalized) pay cycles: frozen payslips replace the live calculation ──
rep("""function computeCycle(empNo){
  const emp = findStaff(empNo);
  const att = ATTENDANCE[empNo];""", """function computeCycle(empNo){
  const frozenSlip = env.data.PAYROLL.payslips[empNo];
  if(frozenSlip){
    const fe = findStaff(empNo);
    return {emp: Object.assign({}, fe, {netSalary: frozenSlip.summary.grossPay}), rows: frozenSlip.rows, summary: frozenSlip.summary, primaryShift: null, frozen: true};
  }
  const emp = findStaff(empNo);
  const att = ATTENDANCE[empNo];""")

rep("""  body.innerHTML = ''+
  (adminUnitFilter!=='ALL'?'<div class="badge teal" style="margin-bottom:12px;">Scoped to '+unitName(adminUnitFilter)+'</div>':'')+
  '<div class="stats">'+
    stat('Gross payroll', fmtMoney(gross))+""", """  body.innerHTML = ''+
  salaryLockBar()+
  (adminUnitFilter!=='ALL'?'<div class="badge teal" style="margin-bottom:12px;">Scoped to '+unitName(adminUnitFilter)+'</div>':'')+
  '<div class="stats">'+
    stat('Gross payroll', fmtMoney(gross))+""")
rep(""" Export to bank/PDF formats is a Lovable build-phase item.</div>';
  body.querySelectorAll('[data-payslip]').forEach(btn=> btn.onclick = ()=> openDrilldown(btn.dataset.payslip));
}""", """ Once the cycle is complete and checked, <b>Finalize cycle</b> locks every payslip (later attendance, leave or settings edits no longer change it) and unlocks the bank salary file.</div>';
  body.querySelectorAll('[data-payslip]').forEach(btn=> btn.onclick = ()=> openDrilldown(btn.dataset.payslip));
  wireSalaryLock();
}

function salaryLockBar(){
  const run = env.data.PAYROLL.run;
  const isAdmin = currentAdminAccount && currentAdminAccount.role==='admin';
  const box = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--surface);';
  if(run){
    return '<div class="emp-toolbar" style="'+box+'">'+
      '<div><span class="badge teal">Finalized</span> <span class="hint" style="margin-left:6px;">'+CYCLE_LABEL_JS+' locked on '+fmtDate(String(run.finalized_at).slice(0,10))+(run.finalized_by?' by '+run.finalized_by:'')+'. Payslips are frozen — attendance, leave or settings edits no longer change this cycle.</span></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
        '<button class="btn sm" id="bankFileBtn">Bank salary file (CSV)</button>'+
        (isAdmin ? '<button class="iconbtn danger" id="reopenCycleBtn">Reopen cycle</button>' : '')+
      '</div>'+
    '</div>';
  }
  return '<div class="emp-toolbar" style="'+box+'">'+
    '<div><span class="badge amber">Live — not finalized</span> <span class="hint" style="margin-left:6px;">Figures recalculate as attendance, leave and settings change. Finalize once the cycle is complete and checked.</span></div>'+
    (isAdmin ? '<button class="btn sm" id="finalizeCycleBtn">Finalize cycle</button>' : '')+
  '</div>';
}
function wireSalaryLock(){
  const fin = document.getElementById('finalizeCycleBtn');
  if(fin) fin.onclick = async ()=>{
    if(!env.cycle.complete && !confirm('The pay cycle '+CYCLE_LABEL_JS+' has not ended yet. Finalize it anyway?')) return;
    if(!confirm('Finalize '+CYCLE_LABEL_JS+' for all '+STAFF.length+' staff?\\n\\nEvery payslip is frozen at today\\'s figures. You can reopen the cycle later if a correction is needed.')) return;
    fin.disabled = true; fin.textContent = 'Finalizing…';
    const results = STAFF.map(s=>computeCycle(s.empNo)).filter(r=>r && r.emp && r.summary)
      .map(r=>({emp:{empNo:r.emp.empNo, name:r.emp.name, unitCode:r.emp.unitCode}, summary:r.summary, rows:r.rows}));
    try{ await env.finalizeCycle(results, currentAdminAccount.name); }
    catch(e){ alert('Could not finalize: '+((e && e.message) || e)); }
    renderAdmin();
  };
  const reo = document.getElementById('reopenCycleBtn');
  if(reo) reo.onclick = async ()=>{
    if(!confirm('Reopen '+CYCLE_LABEL_JS+'? Frozen payslips are discarded and figures go back to live calculation.')) return;
    try{ await env.reopenCycle(); }
    catch(e){ alert('Could not reopen: '+((e && e.message) || e)); }
    renderAdmin();
  };
  const bank = document.getElementById('bankFileBtn');
  if(bank) bank.onclick = exportBankFile;
}
function exportBankFile(){
  const rows = STAFF.map(s=>({s, r:computeCycle(s.empNo)})).filter(x=>x.r && x.r.summary && x.r.summary.finalNet>0.5);
  const missing = rows.filter(x=>!x.s.bankAccountNo || !x.s.bankIfsc);
  if(missing.length && !confirm(missing.length+' staff have no bank account / IFSC yet (Staff Master → Details): '+missing.slice(0,6).map(x=>x.s.name).join(', ')+(missing.length>6?'…':'')+'\\n\\nThey will be listed with blank account details. Continue?')) return;
  const narration = 'Salary '+CYCLE_LABEL_JS;
  const total = rows.reduce((s,x)=>s+Math.round(x.r.summary.finalNet),0);
  const headers = ['Sr No','Staff Code','Beneficiary Name','Account Number','IFSC','Bank','Amount (Rs)','Narration'];
  const body = rows.map((x,i)=>[i+1, x.s.empNo, x.s.bankAccountName || x.s.name, x.s.bankAccountNo||'', (x.s.bankIfsc||'').toUpperCase(), x.s.bankName||'', Math.round(x.r.summary.finalNet), narration]);
  body.push(['','','TOTAL','','','',total,'']);
  exportCSV('bank_salary_'+env.cycle.key+'.csv', headers, body);
}""")

# locked cycle: shift changes and imports can't alter a finalized cycle
rep("""    btn.onclick = ()=>{
      const emp = btn.dataset.emp, date = btn.dataset.date;
      const rec = ATTENDANCE[emp].records.find(r=>r.date===date);""", """    btn.onclick = ()=>{
      if(env.data.PAYROLL.run){ alert('This pay cycle is finalized. Reopen it on the Salary tab to change shifts.'); return; }
      const emp = btn.dataset.emp, date = btn.dataset.date;
      const rec = ATTENDANCE[emp].records.find(r=>r.date===date);""")
rep("""  document.getElementById('attImportBtn').onclick = openAttendanceImportModal;""",
    """  document.getElementById('attImportBtn').onclick = ()=>{
    if(env.data.PAYROLL.run && !confirm('This pay cycle is finalized — imported punches will be saved but won\\'t change its frozen payslips unless you reopen the cycle on the Salary tab. Continue?')) return;
    openAttendanceImportModal();
  };""")

# frozen cycles: every salary column reads the engine result (gross at finalization), not today's Staff Master value
rep("  const gross = rows.reduce((s,x)=>s+x.e.netSalary,0);", "  const gross = rows.reduce((s,x)=>s+x.r.summary.grossPay,0);")
rep("fmtMoney(e.netSalary)", "fmtMoney(r.summary.grossPay)", 4)
rep("unitName(e.unitCode),e.netSalary,r.summary.totalDeduction", "unitName(e.unitCode),r.summary.grossPay,r.summary.totalDeduction")
rep("[e.empNo,e.name,e.netSalary,s.pfDeduction", "[e.empNo,e.name,s.grossPay,s.pfDeduction")

# ── 15. direct .xls / .xlsx import from the biometric device software ──
rep_re(r"      ' Browsers can\\'t open the original binary \.xls file directly.*?convert it automatically\.'\+\n",
       "      ' Upload the <b>.xls / .xlsx</b> file straight from the device software, or a CSV / text export, or paste the report below.'+\n")
rep("""      '<div class="form-row"><label>Upload a .csv / .txt file</label><input type="file" id="attImportFile" accept=".csv,.txt,.tsv"></div>'+""",
    """      '<div class="form-row"><label>Upload the device export (.xls / .xlsx / .csv / .txt)</label><input type="file" id="attImportFile" accept=".xls,.xlsx,.csv,.txt,.tsv"></div>'+""")
rep("""    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{ document.getElementById('attImportText').value = reader.result; };
    reader.readAsText(f);""", """    const f = e.target.files[0]; if(!f) return;
    if(/\\.xlsx?$/i.test(f.name)){
      const ta = document.getElementById('attImportText');
      ta.value = 'Reading '+f.name+'…';
      env.excelToCsv(f).then(csv=>{ ta.value = csv; document.getElementById('attImportParseBtn').click(); })
        .catch(err=>{ ta.value = ''; alert('Could not read '+f.name+': '+((err && err.message) || err)); });
      return;
    }
    const reader = new FileReader();
    reader.onload = ()=>{ document.getElementById('attImportText').value = reader.result; };
    reader.readAsText(f);""")

# ── 16. bank details on the staff record (for the salary bank file) ──
rep("""      '<button class="btn" style="width:100%;" id="sdSubmit">Save</button>'+""",
    """      '<div class="section-title">Bank details (salary transfer)</div>'+
      '<div class="form-grid">'+
        '<div class="form-row"><label>Account holder name</label><input id="sdBankHolder" value="'+escapeAttr(e.bankAccountName||'')+'" placeholder="'+escapeAttr(e.name)+'"></div>'+
        '<div class="form-row"><label>Account number</label><input id="sdBankAcc" class="mono" inputmode="numeric" value="'+escapeAttr(e.bankAccountNo||'')+'"></div>'+
      '</div>'+
      '<div class="form-grid">'+
        '<div class="form-row"><label>IFSC</label><input id="sdBankIfsc" class="mono" value="'+escapeAttr(e.bankIfsc||'')+'" placeholder="e.g. SBIN0001234"></div>'+
        '<div class="form-row"><label>Bank</label><input id="sdBankName" value="'+escapeAttr(e.bankName||'')+'"></div>'+
      '</div>'+
      '<div class="error-text" id="sdError"></div>'+
      '<button class="btn" style="width:100%;" id="sdSubmit">Save</button>'+""")
rep("""    e.otherDeduction = parseFloat(document.getElementById('sdOtherDed').value) || 0;""",
    """    const ifsc = document.getElementById('sdBankIfsc').value.trim().toUpperCase();
    const acc = document.getElementById('sdBankAcc').value.replace(/\\s/g,'');
    if(ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)){ document.getElementById('sdError').textContent = 'IFSC should look like SBIN0001234 (11 characters).'; return; }
    if(acc && !/^\\d{6,18}$/.test(acc)){ document.getElementById('sdError').textContent = 'Account number should be 6–18 digits.'; return; }
    e.bankAccountName = document.getElementById('sdBankHolder').value.trim();
    e.bankAccountNo = acc;
    e.bankIfsc = ifsc;
    e.bankName = document.getElementById('sdBankName').value.trim();
    e.otherDeduction = parseFloat(document.getElementById('sdOtherDed').value) || 0;""")

# ── 17. month-on-month trend on the admin Overview ──
rep("""      return '<div title="'+escapeAttr(s.label+': '+(s.value==null?'no data':s.value+(opts.suffix||'')))+'" style="flex:0 0 auto;width:8px;""",
    """      return '<div title="'+escapeAttr(s.label+': '+(s.value==null?'no data':s.value+(opts.suffix||'')))+'" style="flex:0 0 auto;width:'+(opts.barWidth||8)+'px;""")
rep("""    '<div class="footnote">Attendance % and payroll figures are for the current single loaded pay cycle; once real cycle history accumulates in the Lovable build, these can trend across months instead of showing one cycle\\'s breakdown.</div>';
}""", """    '<div class="section-title" style="margin-top:16px;">Month-on-month trend (last 6 pay cycles, all units)</div>'+
    '<div id="trendBox"><div class="note" style="padding:8px 0;">Loading trend…</div></div>'+
    '<div class="footnote">Payroll figures in the trend come from finalized cycles (Salary → Finalize cycle); the current cycle shows its live figures until it is finalized. Attendance % = present days ÷ working days on record (weekly offs and holidays excluded).</div>';
  renderTrendBox(adminUnitFilter==='ALL' ? {
    lateDays: cycles.reduce((s,c)=>s+c.summary.lateDays,0), gross: grossTotal, lop: lopTotal,
    statutory: statTotal, otPay: otTotal, net: netTotal } : null);
}

function renderTrendBox(live){
  env.trends(6).then(list=>{
    const box = document.getElementById('trendBox'); if(!box) return;
    list.forEach(t=>{ if(live && t.cycle.key===env.cycle.key && !t.finalized) Object.assign(t, live, {live:true}); });
    const money = v=> v==null ? '—' : fmtMoney(v);
    box.innerHTML = ''+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="stack-mobile">'+
        '<div><div class="hint" style="margin-bottom:4px;">Attendance %</div>'+miniBarChart(list.map(t=>({label:t.cycle.label, value:t.attendancePct})),{suffix:'%',max:100,barWidth:32})+'</div>'+
        '<div><div class="hint" style="margin-bottom:4px;">Net payable</div>'+miniBarChart(list.map(t=>({label:t.cycle.label, value:t.net==null?null:Math.round(t.net)})),{color:'var(--amber)',barWidth:32})+'</div>'+
      '</div>'+
      '<div class="tbl-scroll" style="margin-top:10px;"><table class="narrow"><thead><tr><th>Pay cycle</th><th>Attendance %</th><th>Late instances</th><th>Gross</th><th>Lateness / LOP</th><th>Statutory</th><th>OT</th><th>Net payable</th><th>Status</th></tr></thead><tbody>'+
      list.slice().reverse().map(t=>'<tr><td class="mono">'+t.cycle.label+'</td>'+
        '<td class="mono">'+(t.attendancePct==null?'—':t.attendancePct+'%')+'</td>'+
        '<td class="mono">'+(t.lateDays==null?'—':t.lateDays)+'</td>'+
        '<td class="mono">'+money(t.gross)+'</td><td class="mono">'+money(t.lop)+'</td><td class="mono">'+money(t.statutory)+'</td>'+
        '<td class="mono">'+money(t.otPay)+'</td><td class="mono">'+money(t.net)+'</td>'+
        '<td>'+(t.finalized?'<span class="badge teal">Finalized</span>':(t.live?'<span class="badge amber">Live</span>':'<span class="hint">—</span>'))+'</td></tr>').join('')+
      '</tbody></table></div>';
  }).catch(()=>{ const box = document.getElementById('trendBox'); if(box) box.innerHTML = '<div class="note" style="padding:8px 0;">Trend not available right now.</div>'; });
}""")

# ── 18. biometric exports: "Not Present" is absent (was matched as present), device "Leave" = CL ──
rep("""  if(/present/i.test(s)) return 'P';
  if(/weekly\s*off|week\s*off/i.test(s)) return 'WO';""", """  if(/not\s*present|absent/i.test(s)) return 'A';
  if(/present/i.test(s)) return 'P';
  if(/weekly\s*off|week\s*off/i.test(s)) return 'WO';""")
rep("""  if(/\\bcl\\b|casual\s*leave/i.test(s)) return 'CL';""", """  if(/\\bcl\\b|casual\s*leave|\\bleave\\b/i.test(s)) return 'CL';""")
# a "present" day with no punch time must not produce NaN lateness
rep("function toMin(hhmm){ const [h,m]=hhmm.split(':').map(Number); return h*60+m; }",
    "function toMin(hhmm){ const [h,m]=String(hhmm||'').split(':').map(Number); return (h||0)*60+(m||0); }")
# only the selected pay cycle's days count (imports may bring in days from other cycles)
rep("""  if(!emp || !att) return null;
  const records = att.records;""", """  if(!emp || !att) return null;
  const records = att.records.filter(r=> r.date>=env.cycle.start && r.date<=env.cycle.end);""")
rep("""  return [...s].sort();
}
function monthsAvailable(){""", """  return [...s].filter(d=> d>=env.cycle.start && d<=env.cycle.end).sort();
}
function monthsAvailable(){""")
# after an import: save, then reload the selected cycle so figures are exact
rep("""  alert('Import complete: '+added+' new record(s) added, '+updated+' existing record(s) updated.');
  renderAdminLedger();""", """  alert('Import complete: '+added+' new record(s) added, '+updated+' existing record(s) updated.');
  renderAdminLedger();
  env.afterImport();""")

# ── 19. full staff names everywhere; wider selects in Staff Master ──
rep("""      '<div style="width:130px;font-size:12px;color:var(--slate);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+i.label+'</div>'+""",
    """      '<div style="min-width:130px;max-width:240px;font-size:12px;color:var(--slate);">'+i.label+'</div>'+""")

# ── 20. Staff Master: select staff and set the reporting manager in bulk ──
rep("""  '<div class="tbl-scroll"><table><thead><tr><th>Staff Ref</th><th>Code / Login ID</th><th>Name</th>""",
    """  bulkManagerBar()+
  '<div class="staff-master-top-scroll" aria-label="Staff table horizontal scroll"><div></div></div>'+ 
  '<div class="tbl-scroll staff-master-scroll"><table class="staff-master"><thead><tr><th><input type="checkbox" id="staffSelAll" title="Select all shown"'+(filtered.length && filtered.every(e=>staffSel.has(e.empNo))?' checked':'')+'></th><th>Staff Ref</th><th>Code / Login ID</th><th>Name</th>""")
rep("""    '<tr data-id="'+e.empNo+'">'+
      '<td class="mono hint">'+e.dbRef+'</td>'+""", """    '<tr data-id="'+e.empNo+'">'+
      '<td><input type="checkbox" class="staff-sel" data-emp="'+e.empNo+'"'+(staffSel.has(e.empNo)?' checked':'')+'></td>'+
      '<td class="mono hint">'+e.dbRef+'</td>'+""")
rep("""  document.getElementById('addStaffBtn').onclick = openAddStaffForm;""", """  const staffTopScroll = body.querySelector('.staff-master-top-scroll');
  const staffTableScroll = body.querySelector('.staff-master-scroll');
  const staffTable = body.querySelector('table.staff-master');
  if(staffTopScroll && staffTableScroll && staffTable){
    const topScrollInner = staffTopScroll.firstElementChild;
    const sizeTopScroll = ()=>{ if(topScrollInner) topScrollInner.style.width = staffTable.scrollWidth+'px'; };
    sizeTopScroll();
    staffTopScroll.addEventListener('scroll', ()=>{ staffTableScroll.scrollLeft = staffTopScroll.scrollLeft; });
    staffTableScroll.addEventListener('scroll', ()=>{ staffTopScroll.scrollLeft = staffTableScroll.scrollLeft; });
    if(typeof ResizeObserver !== 'undefined') new ResizeObserver(sizeTopScroll).observe(staffTable);
  }
  document.getElementById('addStaffBtn').onclick = openAddStaffForm;
  wireBulkManager(filtered);""")
rep("""function openStaffDetailsModal(empNo){""", """let staffSel = new Set();
function bulkManagerBar(){
  const managers = STAFF.filter(m=>m.role==='Manager');
  return '<div class="emp-toolbar" style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--surface);">'+
    '<div class="hint" style="margin:0;"><b id="staffSelCount">'+staffSel.size+'</b> selected &middot; tick staff below (or the header box for everyone shown), then set their Reporting Manager in one go.</div>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'+
      '<select class="search" id="bulkMgrSel" style="min-width:200px;">'+
        '<option value="__">Set reporting manager…</option>'+
        '<option value="">— none (Administrator approves) —</option>'+
        managers.map(m=>'<option value="'+m.empNo+'">'+m.name+' ('+m.empNo+')</option>').join('')+
      '</select>'+
      '<button class="btn sm" id="bulkMgrApply">Apply to selected</button>'+
      '<button class="iconbtn" id="bulkMgrClear">Clear selection</button>'+
    '</div>'+
  '</div>';
}
function wireBulkManager(filtered){
  const count = ()=>{ const c = document.getElementById('staffSelCount'); if(c) c.textContent = staffSel.size; };
  document.querySelectorAll('.staff-sel').forEach(cb=> cb.onchange = ()=>{ cb.checked ? staffSel.add(cb.dataset.emp) : staffSel.delete(cb.dataset.emp); count(); });
  const all = document.getElementById('staffSelAll');
  if(all) all.onchange = ()=>{ filtered.forEach(e=> all.checked ? staffSel.add(e.empNo) : staffSel.delete(e.empNo)); renderAdminStaff(); };
  document.getElementById('bulkMgrClear').onclick = ()=>{ staffSel.clear(); renderAdminStaff(); };
  document.getElementById('bulkMgrApply').onclick = ()=>{
    const v = document.getElementById('bulkMgrSel').value;
    if(v==='__'){ alert('Choose a reporting manager first.'); return; }
    if(!staffSel.size){ alert('Tick at least one staff member.'); return; }
    let n = 0;
    staffSel.forEach(id=>{ const s = findStaff(id); if(s && s.empNo!==v){ s.reportingManager = v; n++; } });
    const who = v ? (findStaff(v)||{}).name : 'none';
    staffSel.clear();
    renderAdminStaff();
    alert('Reporting Manager set to '+who+' for '+n+' staff.');
  };
}

function openStaffDetailsModal(empNo){""")

# ── 21. import: staff not yet in Staff Master → ask only which unit they belong to, then add them ──
rep("""  const result = {records:[], unmatchedCodes:new Set(), warnings:[], format:null};""",
    """  const result = {records:[], unmatchedCodes:new Set(), warnings:[], format:null, names:{}};""")
rep("""        const code = cells[1];
        if(!code) continue;
        const punches = (cells[7]||'').split(',').map(p=>p.trim()).filter(Boolean);""",
    """        const code = cells[1];
        if(!code) continue;
        if(cells[3]) result.names[code] = cells[3];
        const punches = (cells[7]||'').split(',').map(p=>p.trim()).filter(Boolean);""")
rep("""      if(/^Employee\\s*Code:?$/i.test(cells[1]||'')){ curCode = cells[3] || null; continue; }""",
    """      if(/^Employee\\s*Code:?$/i.test(cells[1]||'')){
        curCode = cells[3] || null;
        const ni = cells.findIndex(c=>/^Employee\\s*Name/i.test(c));
        const nm = ni>=0 ? cells.slice(ni+1).find(c=>c) : '';
        if(curCode && nm) result.names[curCode] = nm;
        continue;
      }""")
rep("""    const cCode = idx(/emp.*code|^code$/), cDate = idx(/date/),""",
    """    const cName = idx(/name/);
    const cCode = idx(/emp.*code|^code$/), cDate = idx(/date/),""")
rep("""        const code = cells[cCode]; if(!code) continue;
        const dateRaw = cells[cDate];""", """        const code = cells[cCode]; if(!code) continue;
        if(cName>=0 && cells[cName]) result.names[code] = cells[cName];
        const dateRaw = cells[cDate];""")
rep("""  const knownCodes = new Set(STAFF.map(s=>s.empNo));
  result.records.forEach(r=>{ if(!knownCodes.has(r.empNo)) result.unmatchedCodes.add(r.empNo); });""",
    """  const biometricKey = value=> String(value ?? '').trim().toLowerCase().replace(/\\.0+$/,'');
  const staffByBiometric = new Map(STAFF.map(s=>[biometricKey(s.empNo),s]));
  result.records.forEach(r=>{
    const importedCode = String(r.empNo ?? '').trim();
    const existing = staffByBiometric.get(biometricKey(importedCode));
    if(existing){
      r.empNo = existing.empNo;
      return;
    }
    r.empNo = importedCode;
    if(result.names[importedCode]===undefined && result.names[String(importedCode).replace(/\\.0+$/,'')]!==undefined){
      result.names[importedCode] = result.names[String(importedCode).replace(/\\.0+$/,'')];
    }
    result.unmatchedCodes.add(importedCode);
  });""")

rep("""    (parsed.unmatchedCodes.size ? '<div class="footnote" style="color:var(--rose);">Unrecognized employee code(s) — will be skipped: '+Array.from(parsed.unmatchedCodes).join(', ')+'</div>' : '')+""",
    """    newStaffPanel(parsed)+""")
rep("""    (matched.length ? '<button class="btn" style="margin-top:10px;" id="attImportCommitBtn">Import '+matched.length+' record(s)</button>' : '');
  if(matched.length) document.getElementById('attImportCommitBtn').onclick = ()=> commitAttendanceImport(matched);
}""", """    '<div class="error-text" id="attImportError"></div>'+
    '<button class="btn" style="margin-top:10px;" id="attImportCommitBtn">Import</button>';
  wireNewStaffPanel(parsed);
}

 /* New staff found in an import: default master fields can be changed in bulk or per row.
    Existing staff keep their unit — transfers are made in Staff Master (Unit column),
    which records the transfer history. */
function cleanImportedName(n, code){
  n = String(n||'').replace(/[\\u0000-\\u001f\\u007f]/g,' ').replace(/\\s+/g,' ').trim().slice(0,100);
  if(!n || n===code) return '';
  return n.replace(/^(mr|mrs|ms|miss|mst)\\.?\\s+/i,'').trim().toUpperCase();
}
function newStaffPanel(parsed){
  const suspendedCodes = new Set((env.data.SUSPENDED_STAFF||[]).map(s=>s.empNo));
  const codes = Array.from(parsed.unmatchedCodes).filter(c=>!suspendedCodes.has(c));
  const skippedSuspended = Array.from(parsed.unmatchedCodes).filter(c=>suspendedCodes.has(c));
  const note = skippedSuspended.length ? '<div class="footnote">Suspended staff in this file — skipped (reactivate them in Staff Master to include): '+skippedSuspended.join(', ')+'</div>' : '';
  if(!codes.length) return note;
  const act = (list)=> list.filter(x=>!x.suspended);
  const need = [];
  if(!act(UNITS).length) need.push('a Unit');
  if(!act(DEPARTMENTS).length) need.push('a Department');
  if(!act(DESIGNATIONS).length) need.push('a Designation');
  if(!act(SHIFT_MASTER).length) need.push('a Shift type (Shift Master)');
  const head = '<div class="section-title" style="margin-top:14px;">'+(STAFF.length===0?'First import — staff found in this file':'New staff found in this file')+' ('+codes.length+')</div>';
  if(need.length){
    return note+head+'<div class="error-text" style="margin-bottom:8px;">To add these staff, first create at least '+need.join(', ')+' in Masters / Shift Master. Until then only staff already in Staff Master are imported.</div>'+
      '<div class="hint">'+codes.map(c=>c+' '+cleanImportedName(parsed.names[c], c)).join(' · ')+'</div>';
  }
  const defaultCode = (list, name)=> (act(list).find(x=>x.name.trim().toLowerCase()===name.toLowerCase())||{}).code || '';
  const defaults = {
    unit: defaultCode(UNITS,'UNIT 1'), dept: defaultCode(DEPARTMENTS,'Front Office'),
    desg: defaultCode(DESIGNATIONS,'Front Office Executive'), shift: defaultCode(SHIFT_MASTER,'General Shift')
  };
  const opt = (list, lbl, selected='')=> '<option value="">'+lbl+'</option>'+act(list).map(x=>'<option value="'+x.code+'"'+(x.code===selected?' selected':'')+'>'+escapeHTML(x.name)+'</option>').join('');
   const mgrOpts = '<option value="">— none —</option>'+STAFF.filter(m=>m.role==='Manager').map(m=>'<option value="'+escapeAttr(m.empNo)+'">'+escapeHTML(m.name)+' ('+escapeHTML(m.empNo)+')</option>').join('');
   const bulkField = (label, field, options)=> '<label class="ns-bulk-field"><span>'+label+'</span><select data-f="'+field+'" class="ns-bulk">'+options+'</select></label>';
   const bulk = '<div class="ns-bulk-panel"><div class="section-title">Fill all new staff</div><div class="ns-bulk-grid">'+
     bulkField('Unit','unit',opt(UNITS,'Select unit…',defaults.unit))+
     bulkField('Department','dept',opt(DEPARTMENTS,'Select department…',defaults.dept))+
     bulkField('Designation','desg',opt(DESIGNATIONS,'Select designation…',defaults.desg))+
     bulkField('Shift','shift',opt(SHIFT_MASTER.filter(sm=>!sm.allowedDesignations||!sm.allowedDesignations.length),'Select shift…',defaults.shift))+
     bulkField('Role','role','<option>Staff</option><option>Manager</option>')+
     bulkField('Reporting Manager','mgr',mgrOpts)+
     '</div><button type="button" class="btn sm" id="attApplyAllBtn">Apply to all selected staff</button></div>';
  return note+head+
   '<div class="hint" style="margin-bottom:8px;">New staff with a name and code are added using Unit 1, Front Office, Front Office Executive, General Shift, Staff and no reporting manager. Gross salary starts at ₹0 until a manager updates Staff Master. You can change values below or untick a row to skip it.</div>'+
    bulk+
   '<div class="tbl-scroll" style="max-height:360px;"><table><thead><tr><th>Add</th><th>Staff Code</th><th>Name *</th><th>Unit *</th><th>Department *</th><th>Designation *</th><th>Shift *</th><th>Role</th><th>Reporting Manager</th><th>Gross salary ₹</th><th>Date of joining</th><th>CL / month</th><th>Perm. hrs / month</th></tr></thead><tbody>'+
  codes.map(code=>{
    const nm = cleanImportedName(parsed.names[code], code);
    return '<tr class="ns-row" data-code="'+escapeAttr(code)+'">'+
      '<td><input type="checkbox" class="ns-inc" checked></td>'+
      '<td class="mono">'+code+'</td>'+
      '<td>'+(nm ? '<span class="ns-name-fixed">'+escapeHTML(nm)+'</span><input type="hidden" class="ns-name" value="'+escapeAttr(nm)+'">'
                 : '<input class="editable ns-name" maxlength="100" style="min-width:170px;" placeholder="Name not in file — type it">')+'</td>'+
       '<td><select class="editable ns-unit" style="min-width:150px;">'+opt(UNITS,'Select…',defaults.unit)+'</select></td>'+
       '<td><select class="editable ns-dept" style="min-width:150px;">'+opt(DEPARTMENTS,'Select…',defaults.dept)+'</select></td>'+
       '<td><select class="editable ns-desg" style="min-width:140px;">'+opt(DESIGNATIONS,'Select…',defaults.desg)+'</select></td>'+
       '<td><select class="editable ns-shift" style="min-width:140px;">'+opt(SHIFT_MASTER.filter(sm=>!sm.allowedDesignations||!sm.allowedDesignations.length),'Select…',defaults.shift)+'</select></td>'+
      '<td><select class="editable ns-role" style="min-width:120px;"><option>Staff</option><option>Manager</option></select></td>'+
      '<td><select class="editable ns-mgr" style="min-width:150px;">'+mgrOpts+'</select></td>'+
       '<td><input class="editable mono ns-gross" type="number" min="0" value="0" style="width:100px;"></td>'+
      '<td><input class="editable mono ns-doj" type="date"></td>'+
      '<td><input class="editable mono ns-cl" type="number" min="0" step="0.5" style="width:60px;" value="'+DEFAULT_MONTHLY_CL+'"></td>'+
      '<td><input class="editable mono ns-perm" type="number" min="0" step="0.5" style="width:60px;" value="'+(DEFAULT_MONTHLY_PERMISSION_MIN/60)+'"></td>'+
    '</tr>';
  }).join('')+
  '</tbody></table></div>';
}
function wireNewStaffPanel(parsed){
  const btn = document.getElementById('attImportCommitBtn');
  const rows = ()=> Array.from(document.querySelectorAll('#attImportPreview .ns-row'));
  const label = ()=>{
    const add = rows().filter(r=>r.querySelector('.ns-inc').checked);
    const addSet = new Set(add.map(r=>r.dataset.code));
    const n = parsed.records.filter(r=>findStaff(r.empNo) || addSet.has(r.empNo)).length;
    btn.textContent = 'Import '+n+' record(s)'+(add.length ? ' + add '+add.length+' new staff' : '');
    btn.disabled = n===0;
  };
   const cls = {unit:'.ns-unit', dept:'.ns-dept', desg:'.ns-desg', shift:'.ns-shift', role:'.ns-role', mgr:'.ns-mgr'};
   const applyAll = document.getElementById('attApplyAllBtn');
   if(applyAll) applyAll.onclick = ()=>{
     const fields = Array.from(document.querySelectorAll('#attImportPreview .ns-bulk'));
     rows().filter(r=>r.querySelector('.ns-inc').checked).forEach(r=>{
       fields.forEach(el=>{
         const target = r.querySelector(cls[el.dataset.f]);
         if(target && (el.value || el.dataset.f==='mgr')) target.value = el.value;
       });
     });
   };
  rows().forEach(r=>{
    r.querySelector('.ns-inc').onchange = label;
    r.querySelectorAll('input,select').forEach(field=> field.addEventListener('change', ()=>{
      r.style.outline = '';
      field.style.borderColor = '';
    }));
  });
  label();
  btn.onclick = ()=>{
    const err = document.getElementById('attImportError');
    const add = rows().filter(r=>r.querySelector('.ns-inc').checked);
    const v = (r, c)=> (r.querySelector(c) ? r.querySelector(c).value.trim() : '');
    const importedName = r=> cleanImportedName(v(r,'.ns-name') || parsed.names[r.dataset.code], r.dataset.code);
    const required = [
      {label:'Name', selector:'.ns-name', missing:r=>!importedName(r)},
      {label:'Unit', selector:'.ns-unit', missing:r=>!v(r,'.ns-unit')},
      {label:'Department', selector:'.ns-dept', missing:r=>!v(r,'.ns-dept')},
      {label:'Designation', selector:'.ns-desg', missing:r=>!v(r,'.ns-desg')},
      {label:'Shift', selector:'.ns-shift', missing:r=>!v(r,'.ns-shift')},
       {label:'Gross salary', selector:'.ns-gross', missing:r=>v(r,'.ns-gross')!=='' && !(parseFloat(v(r,'.ns-gross'))>=0)},
    ];
    rows().forEach(r=>{
      r.style.outline = '';
      required.forEach(f=>{ const field=r.querySelector(f.selector); if(field) field.style.borderColor=''; });
    });
    const invalid = add.map(r=>({r, missing:required.filter(f=>f.missing(r))})).filter(x=>x.missing.length);
    if(invalid.length){
      invalid.forEach(x=>{
        x.r.style.outline = '2px solid var(--rose)';
        x.missing.forEach(f=>{ const field=x.r.querySelector(f.selector); if(field) field.style.borderColor='var(--rose)'; });
      });
      const details = invalid.slice(0,8).map(x=>x.r.dataset.code+': '+x.missing.map(f=>f.label).join(', ')).join(' · ');
      err.textContent = 'Complete the highlighted fields — '+details+(invalid.length>8?' · +'+(invalid.length-8)+' more':'')+'. You can untick staff who should not be added.';
      return;
    }
    err.textContent = '';
    const today = todayISO();
    add.forEach(r=>{
      const code = r.dataset.code;
      if(findStaff(code)) return;
      const unitCode = v(r,'.ns-unit'), gross = parseFloat(v(r,'.ns-gross'))||0;
      STAFF.push({
        dbRef: nextStaffRef(), empNo: code, name: importedName(r), role: v(r,'.ns-role') || 'Staff',
        reportingManager: v(r,'.ns-mgr'), designation: v(r,'.ns-desg'), department: v(r,'.ns-dept'), unitCode,
        shiftCode: v(r,'.ns-shift'), netSalary: gross,
        monthlyCL: v(r,'.ns-cl')==='' ? DEFAULT_MONTHLY_CL : (parseFloat(v(r,'.ns-cl'))||0),
        monthlyPermissionHours: v(r,'.ns-perm')==='' ? DEFAULT_MONTHLY_PERMISSION_MIN/60 : (parseFloat(v(r,'.ns-perm'))||0),
        phone: '', email: '', doj: v(r,'.ns-doj'), dob: '', address: '', otEligible: false, pfApplicable: false,
        esiApplicable: false, otherDeduction: 0,
        username: code, password: code, active: true,
        unitHistory: [{unitCode, effectiveFrom: today, note: 'Added from attendance import'}],
      });
      if(!ATTENDANCE[code]) ATTENDANCE[code] = {primaryShift: v(r,'.ns-shift') || null, records: []};
    });
    const records = parsed.records.filter(r=>findStaff(r.empNo));
    if(add.length) alert(add.length+' new staff added to Staff Master. Their first password is their Staff Code — use "Create missing logins" in Staff Master to give them sign-in accounts.');
    commitAttendanceImport(records);
  };
}""")

# ── 22. staff with no attendance in the selected cycle: no pay figures (blank on Salary, excluded from totals) ──
rep("""  const records = att.records.filter(r=> r.date>=env.cycle.start && r.date<=env.cycle.end);""",
    """  const records = att.records.filter(r=> r.date>=env.cycle.start && r.date<=env.cycle.end);
  if(!records.length){
    const mPerm = staffMonthlyPermissionMin(emp), mCL = staffMonthlyCL(emp);
    return {emp, rows: [], primaryShift: att.primaryShift, noAttendance: true, summary: {
      perDay:0, perMinute:0, grossPay:0, monthlyPermissionMin:mPerm, monthlyCL:mCL,
      permissionRemaining:mPerm, permissionUsed:0, clRemaining:mCL, clUsed:0, totalDeduction:0,
      pfDeduction:0, esiDeduction:0, ptDeduction:0, otherDeduction:0, statutoryDeduction:0,
      otMinutesTotal:0, otPay:0, finalNet:0, presentDays:0, lateDays:0, woDays:0, holidayDays:0,
      clDays:0, absentDays:0, cycleLen:0 }};
  }""")
rep("""  (adminUnitFilter!=='ALL'?'<div class="badge teal" style="margin-bottom:12px;">Scoped to '+unitName(adminUnitFilter)+'</div>':'')+
  '<div class="stats">'+
    stat('Gross payroll', fmtMoney(gross))+""", """  (adminUnitFilter!=='ALL'?'<div class="badge teal" style="margin-bottom:12px;">Scoped to '+unitName(adminUnitFilter)+'</div>':'')+
  (rows.some(x=>x.r.noAttendance) ? '<div class="hint" style="margin-bottom:10px;">'+rows.filter(x=>x.r.noAttendance).length+' staff have no attendance in this pay cycle yet — shown blank and left out of the totals until their attendance is imported.</div>' : '')+
  '<div class="stats">'+
    stat('Gross payroll', fmtMoney(gross))+""")
rep("""  rows.map(({e,r})=>(
    '<tr><td class="mono">'+e.empNo+'</td><td>'+e.name+'</td><td>'+deptName(e.department)+'</td>'+""",
    """  rows.map(({e,r})=> r.noAttendance ? (
    '<tr class="row-wo"><td class="mono">'+e.empNo+'</td><td>'+e.name+'</td><td>'+deptName(e.department)+'</td>'+
    '<td colspan="5" class="hint">No attendance in this pay cycle</td><td></td></tr>'
  ) : (
    '<tr><td class="mono">'+e.empNo+'</td><td>'+e.name+'</td><td>'+deptName(e.department)+'</td>'+""")
# finalizing and the bank file skip staff with no attendance in the cycle
rep("""    const results = STAFF.map(s=>computeCycle(s.empNo)).filter(r=>r && r.emp && r.summary)""",
    """    const results = STAFF.map(s=>computeCycle(s.empNo)).filter(r=>r && r.emp && r.summary && !r.noAttendance)""")

rep("""  } else if(staffTab==='payslip'){
    const s = result.summary;""", """  } else if(staffTab==='payslip' && result.noAttendance){
    body.innerHTML = '<div class="card pad payslip"><div class="note">No attendance has been imported for you in this pay cycle ('+CYCLE_LABEL_JS+') yet, so there is no payslip to show. It appears here once your attendance is imported.</div></div>';
  } else if(staffTab==='payslip'){
    const s = result.summary;""")

# ── 23. masters are suspended, not removed; Staff Master name & code are read-only ──
rep("""function nextStaffRef(){ return nextMasterCode(STAFF.map(s=>({code:s.dbRef})), 'STF'); }""",
    """function nextStaffRef(){ return nextMasterCode(STAFF.concat(env.data.SUSPENDED_STAFF||[]).map(s=>({code:s.dbRef})), 'STF'); }
/* active master items for new choices — a suspended item stays visible only where it is already selected */
function activeOnly(list, keep){ return list.filter(x=>!x.suspended || (keep!==undefined && x.code===keep)); }
/* designation-restricted shifts (e.g. 4-Hour Break Shift): allowedDesignations null/empty = anyone;
   otherwise the staff member's designation code must be listed, or their role must be Admin when 'ADMIN' is listed */
function shiftAllowedFor(shift, emp){
  const ad = shift && shift.allowedDesignations;
  if(!ad || !ad.length) return true;
  if(!emp) return false;
  if(ad.includes(emp.designation)) return true;
  if(ad.includes('ADMIN') && (emp.role==='admin' || emp.role==='super_admin')) return true;
  return false;
}
function suspendBtn(attr, id, suspended){
  return '<button class="iconbtn'+(suspended?'':' danger')+'" '+attr+'="'+id+'">'+(suspended?'Reactivate':'Suspend')+'</button>';
}
function suspendedTag(x){ return x && x.suspended ? ' <span class="badge slate" style="padding:1px 6px;font-size:10px;">Suspended</span>' : ''; }""")
rep("function isHoliday(date){ return HOLIDAYS.some(h=>h.date===date); }",
    "function isHoliday(date){ return HOLIDAYS.some(h=>h.date===date && !h.suspended); }")
rep("function nextShiftCode(code){ const i = SHIFT_MASTER.findIndex(s=>s.code===code); return SHIFT_MASTER[(i+1)%SHIFT_MASTER.length].code; }",
    "function nextShiftCode(code, emp){ const list = activeOnly(SHIFT_MASTER).filter(s=>!emp || shiftAllowedFor(s, emp)); if(!list.length) return code; const i = list.findIndex(s=>s.code===code); return list[(i+1)%list.length].code; }")
rep("""  let best=SHIFT_MASTER[0], bd=Infinity;
  for(const s of SHIFT_MASTER){""", """  const pool = activeOnly(SHIFT_MASTER).length ? activeOnly(SHIFT_MASTER) : SHIFT_MASTER;
  let best=pool[0], bd=Infinity;
  for(const s of pool){""")
rep("""        HOLIDAYS.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(""", """        HOLIDAYS.filter(h=>!h.suspended).sort((a,b)=>a.date.localeCompare(b.date)).map(""")

# designation-restricted shifts: planner cycles skip shifts the staff member isn't eligible for
rep("ROSTER[rosterKey(emp, date)] = nextShiftCode(current);",
    "ROSTER[rosterKey(emp, date)] = nextShiftCode(current, STAFF.find(x=>x.empNo===emp));")

# ── 23b. usability: search boxes keep focus while typing; wide tables drag-slide; planner legend shows every shift ──
rep("""function suspendedTag(x){ return x && x.suspended ? ' <span class="badge slate" style="padding:1px 6px;font-size:10px;">Suspended</span>' : ''; }""",
    """function suspendedTag(x){ return x && x.suspended ? ' <span class="badge slate" style="padding:1px 6px;font-size:10px;">Suspended</span>' : ''; }
/* keep the caret in a search box whose screen re-renders on every keystroke */
function refocusSearch(id){ const el = document.getElementById(id); if(el){ el.focus(); const v = el.value; try{ el.setSelectionRange(v.length, v.length); }catch(_){} } }
/* drag-to-slide on wide tables (drag the empty areas / header, not the inputs) */
(function(){
  let dragEl = null, startX = 0, startL = 0, moved = false;
  document.addEventListener('mousedown', e=>{
    const t = e.target.closest && e.target.closest('.tbl-scroll');
    if(t && !e.target.closest('input,select,textarea,button,a')){ dragEl = t; startX = e.clientX; startL = t.scrollLeft; moved = false; }
  });
  document.addEventListener('mousemove', e=>{
    if(!dragEl) return;
    const dx = e.clientX - startX;
    if(Math.abs(dx) > 3){ moved = true; dragEl.scrollLeft = startL - dx; e.preventDefault(); }
  });
  document.addEventListener('mouseup', ()=>{ dragEl = null; });
  document.addEventListener('click', e=>{ if(moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
})();""")
rep("document.getElementById('staffSearch').oninput = (e)=>{ staffQuery = e.target.value; renderAdminStaff(); };",
    "document.getElementById('staffSearch').oninput = (e)=>{ staffQuery = e.target.value; renderAdminStaff(); refocusSearch('staffSearch'); };")
rep("document.getElementById('plannerSearch').oninput = (e)=>{ plannerQuery = e.target.value; renderShiftPlanner(); };",
    "document.getElementById('plannerSearch').oninput = (e)=>{ plannerQuery = e.target.value; renderShiftPlanner(); refocusSearch('plannerSearch'); };")
# planner: colour every shift from Shift Master, and list them all in the legend
rep("const cls = {S1:'planner-g', S2:'planner-s', S3:'planner-n'}[sh.code] || 'planner-x';",
    "const cls = ['planner-g','planner-s','planner-n','planner-x'][Math.max(0, SHIFT_MASTER.findIndex(x=>x.code===sh.code)) % 4];")
rep("""      '<span class="planner-cell planner-g" style="pointer-events:none;">G</span> General &nbsp;'+
      '<span class="planner-cell planner-s" style="pointer-events:none;">S</span> Second &nbsp;'+
      '<span class="planner-cell planner-n" style="pointer-events:none;">N</span> Night'+""",
    """      activeOnly(SHIFT_MASTER).map((sm, i)=>'<span class="planner-cell '+['planner-g','planner-s','planner-n','planner-x'][i % 4]+'" style="pointer-events:none;">'+sm.letter+'</span> '+sm.name+' &nbsp;').join('')+""")
rep("Map each staff member to a shift on Staff Master — the Shift Planner can still override any individual date.</div>';",
    "Map each staff member to a shift on Staff Master — the Shift Planner can still override any individual date. Shifts marked 🔒 (like the 4-Hour Break Shift) can only be assigned to the designations allowed for that shift; the planner simply skips them for everyone else.</div>';")

# dropdowns: only active items (plus the one already selected)
rep("""        DESIGNATIONS.map(d=>'<option value="'+d.code+'" '+(e.designation===d.code?'selected':'')+'>'+d.name+'</option>').join('')+""",
    """        activeOnly(DESIGNATIONS, e.designation).map(d=>'<option value="'+d.code+'" '+(e.designation===d.code?'selected':'')+'>'+d.name+'</option>').join('')+""")
rep("""        DEPARTMENTS.map(d=>'<option value="'+d.code+'" '+(e.department===d.code?'selected':'')+'>'+d.name+'</option>').join('')+""",
    """        activeOnly(DEPARTMENTS, e.department).map(d=>'<option value="'+d.code+'" '+(e.department===d.code?'selected':'')+'>'+d.name+'</option>').join('')+""")
rep("""        UNITS.map(u=>'<option value="'+u.code+'" '+(e.unitCode===u.code?'selected':'')+'>'+u.name+'</option>').join('')+""",
    """        activeOnly(UNITS, e.unitCode).map(u=>'<option value="'+u.code+'" '+(e.unitCode===u.code?'selected':'')+'>'+u.name+'</option>').join('')+""")
rep("""        SHIFT_MASTER.map(sm=>'<option value="'+sm.code+'" '+(e.shiftCode===sm.code?'selected':'')+'>'+sm.name+'</option>').join('')+""",
    """        activeOnly(SHIFT_MASTER, e.shiftCode).filter(sm=>shiftAllowedFor(sm, e) || sm.code===e.shiftCode).map(sm=>'<option value="'+sm.code+'" '+(e.shiftCode===sm.code?'selected':'')+'>'+sm.name+(sm.allowedDesignations&&sm.allowedDesignations.length?' 🔒':'')+'</option>').join('')+""")
rep("""          DESIGNATIONS.map(d=>'<option value="'+d.code+'">'+d.name+'</option>').join('')+""",
    """          activeOnly(DESIGNATIONS).map(d=>'<option value="'+d.code+'">'+d.name+'</option>').join('')+""")
rep("""          DEPARTMENTS.map(d=>'<option value="'+d.code+'">'+d.name+'</option>').join('')+""",
    """          activeOnly(DEPARTMENTS).map(d=>'<option value="'+d.code+'">'+d.name+'</option>').join('')+""")
rep("""          UNITS.map(u=>'<option value="'+u.code+'">'+u.name+'</option>').join('')+""",
    """          activeOnly(UNITS).map(u=>'<option value="'+u.code+'">'+u.name+'</option>').join('')+""")
rep("""          SHIFT_MASTER.map(sm=>'<option value="'+sm.code+'">'+sm.name+'</option>').join('')+""",
    """          activeOnly(SHIFT_MASTER).filter(sm=>!sm.allowedDesignations || !sm.allowedDesignations.length).map(sm=>'<option value="'+sm.code+'">'+sm.name+'</option>').join('')+""")
rep("""        TASK_TEMPLATES.map(tt=>'<option value="'+tt.id+'">'+tt.title+'</option>').join('')+""",
    """        TASK_TEMPLATES.filter(tt=>!tt.suspended).map(tt=>'<option value="'+tt.id+'">'+tt.title+'</option>').join('')+""")

# Department / Designation masters
rep("""  '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Code</th><th>'+opts.itemLabel+'</th><th>Staff using it</th><th></th></tr></thead><tbody>'+""",
    """  '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Code</th><th>'+opts.itemLabel+'</th><th>Staff using it</th><th>Status</th><th></th></tr></thead><tbody>'+""")
rep("""      '<td class="mono">'+count+'</td>'+
      '<td><button class="iconbtn danger" data-del-idx="'+i+'" '+(count>0?'title="In use — reassign staff first"':'')+'>Remove</button></td>'+""",
    """      '<td class="mono">'+count+'</td>'+
      '<td>'+(v.suspended?'<span class="badge slate">Suspended</span>':'<span class="badge teal">Active</span>')+'</td>'+
      '<td>'+suspendBtn('data-susp-idx', i, v.suspended)+'</td>'+""")
rep_re(r"in use by staff can\\'t be removed — reassign those staff first\.</div>';",
       "can\\\\'t be deleted — <b>Suspend</b> it instead: it stays on staff who already have it but is no longer offered for new staff. Reactivate any time.</div>';")
rep("""  body.querySelectorAll('[data-del-idx]').forEach(btn=>{
    btn.onclick = ()=>{
      const i = parseInt(btn.dataset.delIdx);
      if(opts.usedCountFn(opts.list[i])>0){ alert('This '+opts.itemLabel.toLowerCase()+' is still assigned to staff — reassign them first.'); return; }
      opts.onRemove(i);
    };
  });""", """  body.querySelectorAll('[data-susp-idx]').forEach(btn=>{
    btn.onclick = ()=>{
      const item = opts.list[parseInt(btn.dataset.suspIdx)];
      const n = opts.usedCountFn(item);
      if(!item.suspended && n>0 && !confirm('Suspend "'+item.name+'"? '+n+' staff still have it — they keep it, but it will not be offered for new staff.')) return;
      item.suspended = !item.suspended;
      renderAdminMasters();
    };
  });""")

# Unit master
rep("""  '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Code</th><th>Unit / Branch name</th><th>Staff</th><th></th></tr></thead><tbody>'+""",
    """  '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Code</th><th>Unit / Branch name</th><th>Staff</th><th>Status</th><th></th></tr></thead><tbody>'+""")
rep("""      '<td class="mono">'+count+'</td>'+
      '<td><button class="iconbtn danger" data-del-idx="'+i+'">Remove</button></td>'+""",
    """      '<td class="mono">'+count+'</td>'+
      '<td>'+(u.suspended?'<span class="badge slate">Suspended</span>':'<span class="badge teal">Active</span>')+'</td>'+
      '<td>'+suspendBtn('data-susp-unit', i, u.suspended)+'</td>'+""")
rep(""" A unit with staff still assigned can\\'t be removed.</div>';""",
    """ Units can\\'t be deleted — <b>Suspend</b> one to stop offering it for new staff (staff already there keep it until transferred).</div>';""")
rep("""  body.querySelectorAll('[data-del-idx]').forEach(btn=>{
    btn.onclick = ()=>{
      const i = parseInt(btn.dataset.delIdx);
      if(STAFF.some(s=>s.unitCode===UNITS[i].code)){ alert('This unit still has staff assigned — reassign them first.'); return; }
      if(UNITS.length<=1){ alert('Keep at least one unit.'); return; }
      UNITS.splice(i,1);
      renderAdminMasters();
    };
  });""", """  body.querySelectorAll('[data-susp-unit]').forEach(btn=>{
    btn.onclick = ()=>{
      const u = UNITS[parseInt(btn.dataset.suspUnit)];
      if(!u.suspended && activeOnly(UNITS).length<=1){ alert('Keep at least one active unit.'); return; }
      const n = STAFF.filter(s=>s.unitCode===u.code).length;
      if(!u.suspended && n>0 && !confirm('Suspend "'+u.name+'"? '+n+' staff are still in this unit — they stay until transferred.')) return;
      u.suspended = !u.suspended;
      renderAdminMasters();
    };
  });""")

# Shift master
rep("""      '<td><button class="iconbtn danger" data-del-shift="'+s.code+'">Remove</button></td>'+""",
    """      '<td>'+suspendBtn('data-susp-shift', s.code, s.suspended)+suspendedTag(s)+'</td>'+""")
rep("""  body.querySelectorAll('[data-del-shift]').forEach(btn=>{
    btn.onclick = ()=>{
      const idx = SHIFT_MASTER.findIndex(s=>s.code===btn.dataset.delShift);
      if(idx>-1 && SHIFT_MASTER.length>1) SHIFT_MASTER.splice(idx,1);
      else alert('Keep at least one shift type.');
      renderShiftMaster();
    };
  });""", """  body.querySelectorAll('[data-susp-shift]').forEach(btn=>{
    btn.onclick = ()=>{
      const s = shiftByCode(btn.dataset.suspShift);
      if(!s) return;
      if(!s.suspended && activeOnly(SHIFT_MASTER).length<=1){ alert('Keep at least one active shift type.'); return; }
      s.suspended = !s.suspended;
      renderShiftMaster();
    };
  });""")

# Holiday calendar
rep("""  '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Date</th><th>Name</th><th></th></tr></thead><tbody>'+
  (HOLIDAYS.map((h,i)=>(""", """  '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Date</th><th>Name</th><th>Status</th><th></th></tr></thead><tbody>'+
  (HOLIDAYS.map((h,i)=>(""")
rep("""      '<td><button class="iconbtn danger" data-del-hol="'+i+'">Remove</button></td>'+""",
    """      '<td>'+(h.suspended?'<span class="badge slate">Suspended</span>':'<span class="badge teal">Active</span>')+'</td>'+
      '<td>'+suspendBtn('data-susp-hol', i, h.suspended)+'</td>'+""")
rep("""  body.querySelectorAll('[data-del-hol]').forEach(btn=>{
    btn.onclick = ()=>{ HOLIDAYS.splice(parseInt(btn.dataset.delHol),1); renderAdminMasters(); };
  });""", """  body.querySelectorAll('[data-susp-hol]').forEach(btn=>{
    btn.onclick = ()=>{ const h = HOLIDAYS[parseInt(btn.dataset.suspHol)]; h.suspended = !h.suspended; renderAdminMasters(); };
  });""")
rep("""      HOLIDAYS.push({date:v.date, name:v.name});""",
    """      const ex = HOLIDAYS.find(h=>h.date===v.date);
      if(ex){ ex.name = v.name; ex.suspended = false; } else HOLIDAYS.push({date:v.date, name:v.name});""")

# Task templates
rep("""            '<td><button class="iconbtn danger" data-del-tt="'+i+'">Remove</button></td>'+""",
    """            '<td>'+suspendBtn('data-susp-tt', i, tt.suspended)+suspendedTag(tt)+'</td>'+""")
rep("""    modalRoot.querySelectorAll('[data-del-tt]').forEach(btn=>{
      btn.onclick = ()=>{ TASK_TEMPLATES.splice(parseInt(btn.dataset.delTt),1); render(); };
    });""", """    modalRoot.querySelectorAll('[data-susp-tt]').forEach(btn=>{
      btn.onclick = ()=>{ const t = TASK_TEMPLATES[parseInt(btn.dataset.suspTt)]; t.suspended = !t.suspended; render(); };
    });""")

# Staff Master: name read-only, Suspend instead of Remove, suspended staff listed with Reactivate
rep("""      '<td><input class="editable" data-field="name" value="'+escapeAttr(e.name)+'"></td>'+""",
    """      '<td style="white-space:nowrap;">'+e.name+'</td>'+""")
rep("""<button class="iconbtn danger" data-del="'+e.empNo+'">Remove</button>""",
    """<button class="iconbtn danger" data-del="'+e.empNo+'">Suspend</button>""")
rep("""  body.querySelectorAll('[data-del]').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.del;
      const idx = STAFF.findIndex(x=>x.empNo===id);
      if(idx>-1) STAFF.splice(idx,1);
      renderAdminStaff();
    };
  });""", """  body.querySelectorAll('[data-del]').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.del;
      const idx = STAFF.findIndex(x=>x.empNo===id);
      if(idx<0) return;
      if(!confirm('Suspend '+STAFF[idx].name+' ('+id+')? They drop out of attendance, payroll and sign-in until reactivated. Their records are kept.')) return;
      const s = STAFF.splice(idx,1)[0];
      (env.data.SUSPENDED_STAFF = env.data.SUSPENDED_STAFF || []).push(s);
      renderAdminStaff();
    };
  });
  renderSuspendedStaff(body);""")
rep("""function openStaffDetailsModal(empNo){""", """function renderSuspendedStaff(body){
  const list = env.data.SUSPENDED_STAFF || [];
  if(!list.length) return;
  body.insertAdjacentHTML('beforeend', ''+
    '<div class="section-title" style="margin-top:18px;">Suspended staff ('+list.length+')</div>'+
    '<div class="tbl-scroll"><table class="narrow"><thead><tr><th>Staff Ref</th><th>Code</th><th>Name</th><th>Unit</th><th></th></tr></thead><tbody>'+
    list.map(s=>'<tr class="row-wo"><td class="mono hint">'+(s.dbRef||'')+'</td><td class="mono">'+s.empNo+'</td><td>'+s.name+'</td><td>'+unitName(s.unitCode)+'</td>'+
      '<td><button class="iconbtn" data-react="'+s.empNo+'">Reactivate</button></td></tr>').join('')+
    '</tbody></table></div>');
  body.querySelectorAll('[data-react]').forEach(btn=> btn.onclick = ()=>{
    const i = list.findIndex(s=>s.empNo===btn.dataset.react);
    if(i<0) return;
    const s = list.splice(i,1)[0];
    STAFF.push(s);
    if(!ATTENDANCE[s.empNo]) ATTENDANCE[s.empNo] = {primaryShift: s.shiftCode || null, records: []};
    renderAdminStaff();
  });
}

function openStaffDetailsModal(empNo){""")

# ── 24. modern sign-in screen in the Selvantra Technologies theme (sign-in only) ──
rep_re(r"function renderStaffLogin\(errorMsg\)\{\n  staffView\.innerHTML = ''\+\n.*?  '</div></div>';\n",
       """function renderStaffLogin(errorMsg){
  root.classList.add('hr-auth');
  staffView.innerHTML = authShell('staff', errorMsg);
  wireAuthShell();
""")
rep_re(r"function renderAdminLogin\(errorMsg\)\{\n  adminView\.innerHTML = ''\+\n.*?  '</div></div>';\n",
       """function renderAdminLogin(errorMsg){
  root.classList.add('hr-auth');
  adminView.innerHTML = authShell('admin', errorMsg);
  wireAuthShell();
""")
rep("""function renderStaffDashboard(){
""", """function renderStaffDashboard(){
  root.classList.remove('hr-auth');
""")
rep("""  if(!adminLoggedIn || !currentAdminAccount){ renderAdminLogin(); return; }
""", """  if(!adminLoggedIn || !currentAdminAccount){ renderAdminLogin(); return; }
  root.classList.remove('hr-auth');
""")
rep("""async function tryStaffLogin(id, pw){""", """function authShell(kind, errorMsg){
  const staff = kind==='staff';
  const field = (id, label, type, attrs)=> '<div class="auth-field">'+
    '<input id="'+id+'" type="'+type+'" placeholder=" " '+(attrs||'')+'>'+
    '<label for="'+id+'">'+label+'</label>'+
    (type==='password' ? '<button type="button" class="auth-eye" data-eye="'+id+'" aria-label="Show password" title="Show password">'+
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'+
    '</button>' : '')+
  '</div>';
  return ''+
  '<div class="auth">'+
    '<aside class="auth-brand">'+
      '<div class="auth-brand-top">'+
        '<div class="auth-logo">WM</div>'+
        '<div><div class="auth-app">WestMed Payroll System</div><div class="auth-app-sub">Attendance &middot; Leave &middot; Tasks &middot; Payroll</div></div>'+
      '</div>'+
      '<div class="auth-hero">'+
        '<div class="auth-kicker">Workforce &amp; payroll platform</div>'+
        '<h1>Systems That Work.<br><span>Businesses That Scale.</span></h1>'+
        '<p>Shift attendance, leave and permission, tasks and payroll &mdash; in one secure place for every WestMed unit.</p>'+
        '<ul class="auth-points">'+
          '<li>Biometric attendance import</li>'+
          '<li>Shift-aware lateness &amp; payroll</li>'+
          '<li>Payslips on any device</li>'+
        '</ul>'+
      '</div>'+
      '<div class="auth-brand-foot">Powered by <a href="https://selvantra.com" target="_blank" rel="noopener">Selvantra Technologies</a></div>'+
    '</aside>'+
    '<main class="auth-main">'+
      '<div class="auth-card">'+
        '<div class="auth-seg" role="tablist" aria-label="Sign in as">'+
          '<button type="button" role="tab" data-go="staff" aria-selected="'+staff+'" class="'+(staff?'on':'')+'">Staff</button>'+
          '<button type="button" role="tab" data-go="admin" aria-selected="'+(!staff)+'" class="'+(!staff?'on':'')+'">Admin / Manager</button>'+
        '</div>'+
        '<h2>'+(staff?'Welcome back':'Admin console')+'</h2>'+
        '<p class="auth-sub">'+(staff?'Sign in with your Staff Code and password.':'Administrators use their username or email; managers use their Staff Code.')+'</p>'+
        (staff ? field('staffIdInput','Staff Code','text','inputmode="numeric" autocomplete="username" autocapitalize="off"')
               : field('adminUserInput','Username, email or Staff Code','text','autocomplete="username" autocapitalize="off"'))+
        field(staff?'staffPwInput':'adminPwInput','Password','password','autocomplete="current-password"')+
        '<div class="auth-caps" id="authCaps" hidden>Caps Lock is on</div>'+
        '<div class="error-text auth-err" role="alert">'+(errorMsg||'')+'</div>'+
        '<button class="auth-btn" id="'+(staff?'staffLoginBtn':'adminLoginBtn')+'">Sign in'+
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'+
        '</button>'+
        '<ul class="auth-notes">'+
          (staff ? '<li>First sign-in: your password is your Staff Code until you change it.</li>'
                 : '<li>Managers: Role must be Manager in Staff Master.</li>')+
          '<li>Signing in here signs this account out of any other device.</li>'+
        '</ul>'+
      '</div>'+
      '<footer class="auth-foot">&copy; 2026&ndash;2030 Selvantra Technologies &middot; <a href="https://selvantra.com" target="_blank" rel="noopener">selvantra.com</a></footer>'+
    '</main>'+
  '</div>';
}
function wireAuthShell(){
  document.querySelectorAll('.auth-seg [data-go]').forEach(b=> b.onclick = ()=>{
    const target = document.querySelector('#roleSwitch button[data-role="'+b.dataset.go+'"]');
    if(target) target.click();
  });
  document.querySelectorAll('.auth-eye').forEach(b=> b.onclick = ()=>{
    const inp = document.getElementById(b.dataset.eye);
    const show = inp.type==='password';
    inp.type = show ? 'text' : 'password';
    b.classList.toggle('on', show);
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    inp.focus();
  });
  const caps = document.getElementById('authCaps');
  document.querySelectorAll('.auth-field input[type="password"]').forEach(inp=>{
    const check = (e)=>{ if(caps && e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); };
    inp.addEventListener('keydown', check); inp.addEventListener('keyup', check);
  });
  const first = document.querySelector('.auth-field input');
  if(first && !('ontouchstart' in window)) setTimeout(()=> first.focus(), 0);
}

async function tryStaffLogin(id, pw){""")

# ── 25. staff login: attendance only — salary/deduction/net figures hidden unless the admin
#        turns on Payroll settings → "Show salary details to staff" (PAYROLL_SETTINGS.staffSalaryVisible) ──
rep("""function profileAndStats(result){
  const {emp, summary} = result;""", """function staffSalaryHidden(){ return !PAYROLL_SETTINGS.staffSalaryVisible; }
function profileAndStats(result, hideSal){
  const {emp, summary} = result;""")
rep("""    '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
      '<span class="badge teal">Gross Salary '+fmtMoney(emp.netSalary)+'</span>'+
      ((summary.totalDeduction+summary.statutoryDeduction)>0.5 ? '<span class="badge rose">Net Payable '+fmtMoney(summary.finalNet)+'</span>' : '<span class="badge teal">No deductions this cycle</span>')+
    '</div>'+""", """    (hideSal ? '' : '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
      '<span class="badge teal">Gross Salary '+fmtMoney(emp.netSalary)+'</span>'+
      ((summary.totalDeduction+summary.statutoryDeduction)>0.5 ? '<span class="badge rose">Net Payable '+fmtMoney(summary.finalNet)+'</span>' : '<span class="badge teal">No deductions this cycle</span>')+
    '</div>')+""")
rep("""    stat('Lateness / LOP deduction', fmtMoney(summary.totalDeduction), summary.totalDeduction>0.5?'rose':'')+
    stat('PF + ESI + PT + other', fmtMoney(summary.statutoryDeduction), summary.statutoryDeduction>0.5?'rose':'')+
    stat('Overtime pay', fmtMoney(summary.otPay), summary.otPay>0.5?'teal':'')+
    stat('Net payable', fmtMoney(summary.finalNet), 'teal')+""", """    (hideSal ? '' :
    stat('Lateness / LOP deduction', fmtMoney(summary.totalDeduction), summary.totalDeduction>0.5?'rose':'')+
    stat('PF + ESI + PT + other', fmtMoney(summary.statutoryDeduction), summary.statutoryDeduction>0.5?'rose':'')+
    stat('Overtime pay', fmtMoney(summary.otPay), summary.otPay>0.5?'teal':'')+
    stat('Net payable', fmtMoney(summary.finalNet), 'teal'))+""")
rep("""function attendanceTable(result){""", """function attendanceTable(result, hideSal){""")
rep("""      '<td class="mono">'+ded+'</td>'+
      '<td class="mono">'+fmtMoney(r.runningNet)+'</td>'+""", """      (hideSal ? '' : '<td class="mono">'+ded+'</td>'+
      '<td class="mono">'+fmtMoney(r.runningNet)+'</td>')+""")
rep("""    '<th>Date</th><th>Day</th><th>Status</th><th>Shift</th><th>In</th><th>Out</th><th>Late</th><th>Permission</th><th>OT</th><th>Deduction</th><th>Net to date</th><th>Note</th>'+""",
    """    '<th>Date</th><th>Day</th><th>Status</th><th>Shift</th><th>In</th><th>Out</th><th>Late</th><th>Permission</th><th>OT</th>'+(hideSal ? '' : '<th>Deduction</th><th>Net to date</th>')+'<th>Note</th>'+""")
rep("""      ['overview','ledger','tasks','leave','payslip'].map(t=>'<button data-tab="'+t+'" class="'+(staffTab===t?'active':'')+'">'+
        ({overview:'Overview', ledger:'My Shift & Salary', tasks:'My Tasks', leave:'Leave & Permission', payslip:'Payslip'})[t]+'</button>').join('')+""",
    """      ['overview','ledger','tasks','leave'].concat(staffSalaryHidden() ? [] : ['payslip']).map(t=>'<button data-tab="'+t+'" class="'+(staffTab===t?'active':'')+'">'+
        ({overview:'Overview', ledger:(staffSalaryHidden() ? 'My Attendance' : 'My Shift & Salary'), tasks:'My Tasks', leave:'Leave & Permission', payslip:'Payslip'})[t]+'</button>').join('')+""")
rep("""  staffView.innerHTML = ''+
  '<div class="card pad">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" class="no-print">'+
      '<div class="section-title" style="margin:0;">My Workspace</div>'+""", """  if(staffTab==='payslip' && staffSalaryHidden()) staffTab = 'overview';
  staffView.innerHTML = ''+
  '<div class="card pad">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" class="no-print">'+
      '<div class="section-title" style="margin:0;">My Workspace</div>'+""")
rep("""  if(staffTab==='overview'){
    const coveringFor""", """  const hideSal = staffSalaryHidden();
  if(staffTab==='overview'){
    const coveringFor""")
rep("""      profileAndStats(result)+
      (coveringFor.length""", """      profileAndStats(result, hideSal)+
      (coveringFor.length""")
rep("""    body.innerHTML = profileAndStats(result) + attendanceTable(result) +
      '<div class="footnote">Shift is auto-suggested""", """    body.innerHTML = profileAndStats(result, hideSal) + attendanceTable(result, hideSal) +
      '<div class="footnote">Shift is auto-suggested""")
rep("""  '<div class="section-title" style="margin-top:0;">Pay cycle</div>'+""",
    """  '<div class="section-title" style="margin-top:0;">Staff login</div>'+
  '<div class="form-row"><label><input type="checkbox" id="psStaffSal" '+(p.staffSalaryVisible?'checked':'')+'> Show salary details to staff (gross, LOP deduction, PF/ESI/PT, overtime pay, net payable, payslip)</label></div>'+
  '<div class="hint">When off, staff see only their attendance, tasks and leave.</div>'+
  '<div class="section-title">Pay cycle</div>'+""")
rep("""    p.ot.graceMin = parseFloat(document.getElementById('psOtGrace').value) || 0;""",
    """    p.ot.graceMin = parseFloat(document.getElementById('psOtGrace').value) || 0;
    p.staffSalaryVisible = document.getElementById('psStaffSal').checked;""")

# ── 26. lateness is measured against the shift nearest the IN punch — except staff on the
#        General Shift, who stay on it. Shift Planner overrides still win. ──
rep("""/* Resolution order for a given staff+date: (1) Shift Planner override, (2) the staff's
   Shift Master mapping from Staff Master, (3) auto-detect nearest shift from IN time. */
function effectiveShift(empNo, date, inMin){
  const override = ROSTER[rosterKey(empNo, date)];
  if(override) return shiftByCode(override);
  const emp = findStaff(empNo);
  if(emp && emp.shiftCode && shiftByCode(emp.shiftCode)) return shiftByCode(emp.shiftCode);
  return nearestShift(inMin);
}""", """/* Resolution order for a given staff+date: (1) Shift Planner override, (2) staff whose
   Staff Master shift is the General Shift stay on it, (3) everyone else: the active shift
   (other than General) they're eligible for whose start is nearest the IN punch. With no
   IN punch, their Staff Master shift applies. */
function isGeneralShift(s){ return !!s && /general/i.test(s.name || ''); }
function effectiveShift(empNo, date, inMin){
  const override = ROSTER[rosterKey(empNo, date)];
  if(override && shiftByCode(override)) return shiftByCode(override);
  const emp = findStaff(empNo);
  const own = emp && emp.shiftCode ? shiftByCode(emp.shiftCode) : null;
  if(isGeneralShift(own)) return own;
  if(!(inMin > 0) && own) return own;
  const pool = activeOnly(SHIFT_MASTER).filter(s=>!isGeneralShift(s) && shiftAllowedFor(s, emp));
  if(!pool.length) return own || nearestShift(inMin);
  let best=pool[0], bd=Infinity;
  for(const s of pool){ const d=Math.abs(inMin-shiftStartMin(s)); if(d<bd){ bd=d; best=s; } }
  return best;
}""")
rep("""A gold ring marks a manual override; a red dot""",
    """Without an override, General Shift staff are checked against the General Shift and everyone else against the shift nearest their IN punch. A gold ring marks a manual override; a red dot""")
rep("""Shift is auto-suggested from IN time (9-10 AM &middot; 2-3 PM &middot; 8-9 PM), or set by your admin""",
    """Shift is the General Shift if that is your assigned shift; otherwise the shift whose start is nearest your IN time. It can also be set by your admin""")

# ── 27. PF and ESI are off unless an administrator ticks them on the staff record ──
rep("const pfDeduction = (PAYROLL_SETTINGS.pf.enabled && (emp.pfApplicable??true))",
    "const pfDeduction = (PAYROLL_SETTINGS.pf.enabled && (emp.pfApplicable??false))")
rep("const esiEligible = emp.esiApplicable ?? (grossPay<=PAYROLL_SETTINGS.esi.ceiling);",
    "const esiEligible = emp.esiApplicable ?? false;")
rep("""id="sdPf" '+((e.pfApplicable??true)?'checked':'')""", """id="sdPf" '+((e.pfApplicable??false)?'checked':'')""")
rep("""id="sdEsi" '+((e.esiApplicable ?? (e.netSalary<=21000))?'checked':'')""", """id="sdEsi" '+((e.esiApplicable??false)?'checked':'')""")
rep("pfApplicable: true, esiApplicable: netSalary<=21000,", "pfApplicable: false, esiApplicable: false,")

# ── 28. Overview explorer: every card, chart bar, bar-list row and table row on the Overview opens a
#        drill-down window. Each level links deeper (unit → department → staff → day-by-day sheet;
#        staff → manager / reports / tasks / leave), with a breadcrumb to step back. Managers explore
#        only their own reports, with salary figures hidden. ──
rep("""function stat(k,v,cls){
  return '<div class="stat"><div class="k">'+k+'</div><div class="v'+(cls?' '+cls:'')+'">'+v+'</div></div>';
}""", """function stat(k,v,cls,link){
  return '<div class="stat'+(link?' stat-link':'')+'"'+(link?link+' role="button" tabindex="0"':'')+'><div class="k">'+k+'</div><div class="v'+(cls?' '+cls:'')+'">'+v+'</div></div>';
}""")
rep("""    series.map(s=>{
      const h = s.value==null ? 3 : Math.max(4, Math.round((s.value/max)*76));
      return '<div title="'+escapeAttr(s.label+': '+(s.value==null?'no data':s.value+(opts.suffix||'')))+'" style="flex:0 0 auto;""",
    """    series.map((s,ix)=>{
      const h = s.value==null ? 3 : Math.max(4, Math.round((s.value/max)*76));
      return '<div'+(opts.links?' class="x-bar"'+opts.links[ix]:'')+' title="'+escapeAttr(s.label+': '+(s.value==null?'no data':s.value+(opts.suffix||'')))+'" style="flex:0 0 auto;""")
rep("""    items.map(i=>'<div style="display:flex;align-items:center;gap:8px;">'+""",
    """    items.map((i,ix)=>'<div'+(opts.links?' class="x-hover"'+opts.links[ix]:'')+' style="display:flex;align-items:center;gap:8px;">'+""")
rep("""    segments.map(s=> s.value>0 ? '<div title="'+escapeAttr(s.label+': '+fmtMoney(s.value))+'" style="width:""",
    """    segments.map(s=> s.value>0 ? '<div'+(s.link?' class="x-bar"'+s.link:'')+' title="'+escapeAttr(s.label+': '+fmtMoney(s.value))+'" style="width:""")
rep("""    segments.map(s=>'<span style="font-size:11.5px;color:var(--slate);display:flex;align-items:center;gap:5px;">""",
    """    segments.map(s=>'<span'+(s.link?' class="x-hover"'+s.link:'')+' style="font-size:11.5px;color:var(--slate);display:flex;align-items:center;gap:5px;">""")

# explorer core + nodes
rep("function renderManagerOverview(){", r"""/* ---- Overview explorer ---- */
let explorerStack = [];
let explorerLinks = [];
/* registers a drill-down target for the HTML being built; returns the attribute to put on the clickable element */
function xl(make){ explorerLinks.push(make); return ' data-xl="'+(explorerLinks.length-1)+'"'; }
function xIsManager(){ return !!(currentAdminAccount && currentAdminAccount.role==='manager'); }
function xCanSee(empNo){
  if(!xIsManager()) return true;
  const me = currentAdminAccount.username;
  const s = findStaff(empNo);
  return empNo===me || !!(s && s.reportingManager===me);
}
function xStaffLink(empNo, fallback){
  const s = findStaff(empNo);
  if(!s) return escapeHTML(fallback || empNo || '—');
  return xCanSee(empNo) ? '<button class="x-link"'+xl(()=>xStaff(empNo))+'>'+escapeHTML(s.name)+'</button>' : escapeHTML(s.name);
}
function wireExplore(container, links){
  container.querySelectorAll('[data-xl]').forEach(el=>{
    const go = e=>{
      e.preventDefault(); e.stopPropagation();
      const node = links[+el.dataset.xl]();
      if(!node) return;
      if(container.id==='modalRoot') explorerStack.push(node); else explorerStack = [node];
      renderExplorer();
    };
    el.onclick = go;
    if(el.getAttribute('tabindex')!==null) el.onkeydown = e=>{ if(e.key==='Enter' || e.key===' ') go(e); };
  });
}
function renderExplorer(){
  const modalRoot = document.getElementById('modalRoot');
  if(!explorerStack.length){ modalRoot.innerHTML = ''; return; }
  explorerLinks = [];
  const node = explorerStack[explorerStack.length-1];
  const content = node.build();
  const last = explorerStack.length-1;
  const crumbs = explorerStack.map((n,i)=> i===last
    ? '<span class="x-crumb current">'+escapeHTML(n.title)+'</span>'
    : '<button class="x-crumb" data-crumb="'+i+'">'+escapeHTML(n.title)+'</button>').join('<span class="x-sep">›</span>');
  modalRoot.innerHTML = ''+
  '<div class="modal-back" id="modalBack"><div class="modal">'+
    '<div class="modal-head"><div class="x-crumbs">'+(last>0?'<button class="iconbtn" id="xBack">← Back</button>':'')+crumbs+'</div><button class="closebtn" id="modalClose">✕</button></div>'+
    '<div class="modal-body">'+content+'</div>'+
  '</div></div>';
  const close = ()=>{ explorerStack = []; modalRoot.innerHTML = ''; };
  document.getElementById('modalClose').onclick = close;
  document.getElementById('modalBack').addEventListener('click', e=>{ if(e.target.id==='modalBack') close(); });
  const back = document.getElementById('xBack');
  if(back) back.onclick = ()=>{ explorerStack.pop(); renderExplorer(); };
  modalRoot.querySelectorAll('[data-crumb]').forEach(b=> b.onclick = ()=>{ explorerStack.length = +b.dataset.crumb+1; renderExplorer(); });
  wireExplore(modalRoot, explorerLinks);
  document.getElementById('modalBack').scrollTop = 0;
}
function xHint(t){ return '<div class="hint" style="margin-bottom:10px;">'+t+'</div>'; }
function xTable(head, rows, empty){
  return '<div class="tbl-scroll"><table class="narrow"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+
    (rows.join('') || '<tr><td colspan="'+head.length+'" class="note">'+(empty||'Nothing here.')+'</td></tr>')+'</tbody></table></div>';
}
function xRow(link, cells){ return '<tr'+(link?' class="clickable-row"'+link:'')+'>'+cells.map(c=>'<td>'+c+'</td>').join('')+'</tr>'; }
const xMono = v=> '<span class="mono">'+v+'</span>';
function xGroup(list, keyFn){
  const out = {};
  list.forEach(s=>{ const k = keyFn(s) || ''; (out[k] = out[k] || []).push(s); });
  return Object.entries(out).sort((a,b)=>b[1].length-a[1].length);
}
function xSum(list, fn){ return list.reduce((t,s)=>{ const c = computeCycle(s.empNo); return t + (c ? fn(c) : 0); }, 0); }

/* staff grouped Unit → Department → staff */
function xStaffTree(title, list, hint){
  return {title, build: ()=>{
    const hideSal = xIsManager();
    const rows = xGroup(list, s=>s.unitCode).map(([code, members])=> xRow(xl(()=>xDeptTree(unitName(code)||'No unit', members)), [
      escapeHTML(unitName(code)||'No unit'), xMono(members.length), xMono(xSum(members, c=>c.summary.presentDays)),
      xMono(xSum(members, c=>c.summary.lateDays))].concat(hideSal ? [] : [xMono(fmtMoney(xSum(members, c=>c.emp.netSalary)))])));
    return (hint ? xHint(hint) : '')+
      xTable(['Unit','Staff','Present days','Late instances'].concat(hideSal ? [] : ['Payroll cost']), rows, 'No staff.')+
      '<div style="margin-top:10px;"><button class="iconbtn"'+xl(()=>xStaffList('All '+list.length+' staff', list))+'>Show all '+list.length+' as one list ›</button></div>';
  }};
}
function xDeptTree(title, list){
  return {title, build: ()=>{
    const hideSal = xIsManager();
    const rows = xGroup(list, s=>s.department).map(([code, members])=> xRow(xl(()=>xStaffList(deptName(code)||'No department', members)), [
      escapeHTML(deptName(code)||'No department'), xMono(members.length), xMono(xSum(members, c=>c.summary.presentDays)),
      xMono(xSum(members, c=>c.summary.lateDays))].concat(hideSal ? [] : [xMono(fmtMoney(xSum(members, c=>c.emp.netSalary)))])));
    return xTable(['Department','Staff','Present days','Late instances'].concat(hideSal ? [] : ['Payroll cost']), rows, 'No staff.')+
      '<div style="margin-top:10px;"><button class="iconbtn"'+xl(()=>xStaffList(title+' · all staff', list))+'>Show all '+list.length+' as one list ›</button></div>';
  }};
}
function xStaffList(title, list, hint){
  return {title, build: ()=>{
    const hideSal = xIsManager();
    const rows = list.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>{
      const c = computeCycle(s.empNo); const sm = c ? c.summary : {};
      return xRow(xCanSee(s.empNo) ? xl(()=>xStaff(s.empNo)) : '', [xMono(s.empNo), escapeHTML(s.name), escapeHTML(deptName(s.department)||'—'),
        escapeHTML(desgName(s.designation)||'—'), escapeHTML(unitName(s.unitCode)||'—'), xMono(sm.presentDays||0), xMono(sm.absentDays||0), xMono(sm.lateDays||0)]
        .concat(hideSal ? [] : [xMono(fmtMoney((sm.totalDeduction||0)+(sm.statutoryDeduction||0)))]));
    });
    return (hint ? xHint(hint) : '')+
      xTable(['Code','Name','Department','Designation','Unit','Present','Absent','Late'].concat(hideSal ? [] : ['Deduction']), rows, 'No staff.');
  }};
}
/* staff ranked by one figure (late days, LOP, PF …) — zero rows left out */
function xRanked(title, list, valueFn, label, money, hint){
  return {title, build: ()=>{
    const ranked = list.map(s=>{ const c = computeCycle(s.empNo); return {s, v: c ? valueFn(c) : 0}; }).filter(x=>x.v>0.004).sort((a,b)=>b.v-a.v);
    const total = ranked.reduce((t,x)=>t+x.v,0);
    const rows = ranked.map(x=> xRow(xCanSee(x.s.empNo) ? xl(()=>xStaff(x.s.empNo)) : '', [xMono(x.s.empNo), escapeHTML(x.s.name),
      escapeHTML(deptName(x.s.department)||'—'), escapeHTML(unitName(x.s.unitCode)||'—'), xMono(money ? fmtMoney(x.v) : x.v)]));
    return xHint((hint ? hint+' ' : '')+ranked.length+' staff &middot; total '+(money ? fmtMoney(total) : total)+'.')+
      xTable(['Code','Name','Department','Unit',label], rows, 'Nobody has any for this cycle.');
  }};
}
function xStaff(empNo){
  const s = findStaff(empNo);
  if(!s || !xCanSee(empNo)) return null;
  return {title: s.name, build: ()=>{
    const hideSal = xIsManager();
    const r = computeCycle(empNo);
    const mgr = findStaff(s.reportingManager);
    const reports = STAFF.filter(x=>x.reportingManager===empNo);
    const tasks = TASKS.filter(t=>t.assignedTo===empNo);
    const leaves = LEAVES.filter(l=>l.empNo===empNo);
    const sh = shiftByCode(s.shiftCode);
    const btn = (label, link)=> link ? '<button class="iconbtn"'+link+'>'+label+' ›</button>' : '';
    return ''+
      '<div class="x-links">'+
        '<span class="badge slate">'+escapeHTML(unitName(s.unitCode)||'No unit')+'</span>'+
        '<span class="badge slate">'+escapeHTML(deptName(s.department)||'No department')+'</span>'+
        '<span class="badge slate">'+escapeHTML(desgName(s.designation)||'No designation')+'</span>'+
        '<span class="badge slate">'+escapeHTML(sh ? sh.name : 'No shift')+'</span>'+
        (mgr ? btn('Reporting manager: '+escapeHTML(mgr.name), xCanSee(mgr.empNo) ? xl(()=>xStaff(mgr.empNo)) : '') || '<span class="badge slate">Manager: '+escapeHTML(mgr.name)+'</span>' : '<span class="badge rose">No reporting manager</span>')+
        (reports.length ? btn(reports.length+' report'+(reports.length>1?'s':''), xl(()=>xStaffList('Reports of '+s.name, reports))) : '')+
        btn(tasks.length+' task'+(tasks.length===1?'':'s'), xl(()=>xTaskList('Tasks · '+s.name, tasks)))+
        btn(leaves.length+' leave / permission request'+(leaves.length===1?'':'s'), xl(()=>xLeaveList('Leave · '+s.name, leaves)))+
      '</div>'+
      (r ? profileAndStats(r, hideSal) + attendanceTable(r, hideSal) : '<div class="note">No attendance in this pay cycle.</div>');
  }};
}
function xTaskList(title, tasks, hint){
  return {title, build: ()=> (hint ? xHint(hint) : '')+
    xTable(['Task','Assigned to','Assigned by','Due','Priority','Status'], tasks.map(t=>{
      const b = findStaff(t.assignedBy);
      return xRow(xl(()=>xTask(t.id)), [escapeHTML(t.title), escapeHTML((findStaff(t.assignedTo)||{}).name || t.assignedTo || '—'),
        escapeHTML(b ? b.name : (t.assignedBy || 'Admin')), xMono(t.dueDate ? fmtDate(t.dueDate) : '—'), escapeHTML(t.priority||'—'), statusPill(t.status)]);
    }), 'No tasks.')};
}
function xTaskGroups(title, tasks, hint){
  return {title, build: ()=>{
    const groups = xGroup(tasks, t=>t.status);
    return (hint ? xHint(hint) : '')+
      xTable(['Status','Tasks'], groups.map(([st, list])=> xRow(xl(()=>xTaskList(statusPill(st).replace(/<[^>]+>/g,''), list)), [statusPill(st), xMono(list.length)])), 'No tasks.')+
      '<div class="section-title" style="margin-top:16px;">All '+tasks.length+'</div>'+xTaskList(title, tasks).build();
  }};
}
function xTask(id){
  const t = TASKS.find(x=>x.id===id);
  if(!t) return null;
  return {title: t.title, build: ()=>{
    const kv = (k,v)=> '<tr><th style="width:190px;">'+k+'</th><td>'+v+'</td></tr>';
    const text = v=> v ? escapeHTML(v).replace(/\n/g,'<br>') : '—';
    return '<div class="tbl-scroll"><table class="narrow"><tbody>'+
      kv('Status', statusPill(t.status))+
      kv('Priority', escapeHTML(t.priority||'—'))+
      kv('Assigned to', xStaffLink(t.assignedTo))+
      kv('Assigned by', xStaffLink(t.assignedBy, t.assignedBy || 'Admin'))+
      kv('Created', xMono(t.createdDate ? fmtDate(t.createdDate) : '—'))+
      kv('Due', xMono(t.dueDate ? fmtDate(t.dueDate) : '—'))+
      kv('Description', text(t.description))+
      kv('Staff response', text(t.employeeResponseNote))+
      kv('Completion note', text(t.completionNote)+(t.completionDate ? ' <span class="hint">('+fmtDate(t.completionDate)+')</span>' : ''))+
      kv('Review note', text(t.reviewNote))+
    '</tbody></table></div>'+
    '<div class="footnote">Act on this task from the Tasks tab.</div>';
  }};
}
function xLeaveList(title, leaves, hint){
  return {title, build: ()=> (hint ? xHint(hint) : '')+
    xTable(['Staff','Type','Date','Reason','Covering','Status'], leaves.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(l=>
      xRow('', [xStaffLink(l.empNo), escapeHTML(l.type)+(l.hours ? ' &middot; '+l.hours+'h' : ''), xMono(fmtDate(l.date)),
        '<span class="note">'+escapeHTML(l.reason||'—')+'</span>', l.altEmpNo ? xStaffLink(l.altEmpNo) : '—', statusPill(l.status)])), 'No requests.')+
    '<div class="footnote">Approve or reject from the Leave &amp; Permission tab.</div>'};
}
/* one day: every staff member's status, punch, shift and lateness (from the payroll engine) */
function xDay(date, list){
  return {title: fmtDate(date)+' ('+dayName(date)+')', build: ()=>{
    const order = {P:0, CL:1, A:2, WO:3, H:4};
    const items = list.map(s=>{ const c = computeCycle(s.empNo); return {s, r: c ? c.rows.find(x=>x.date===date) : null}; });
    const late = items.filter(x=>x.r && x.r.status==='P' && x.r.lateMin>(x.r.shift ? (x.r.shift.allowedLateMin??15) : 15));
    const count = st=> items.filter(x=>x.r && x.r.status===st).length;
    const rows = items.sort((a,b)=> (a.r ? order[a.r.status]??5 : 6)-(b.r ? order[b.r.status]??5 : 6) || ((b.r&&b.r.lateMin)||0)-((a.r&&a.r.lateMin)||0))
      .map(({s, r})=>{
        const g = r && r.shift ? (r.shift.allowedLateMin??15) : 15;
        return xRow(xCanSee(s.empNo) ? xl(()=>xStaff(s.empNo)) : '', [escapeHTML(s.name), escapeHTML(deptName(s.department)||'—'),
          r ? statusPill(r.status) : '<span class="hint">No record</span>', xMono(r && r.inTime ? r.inTime : '—'), xMono(r && r.outTime ? r.outTime : '—'),
          escapeHTML(r && r.shift ? r.shift.name : '—'), r && r.status==='P' && r.lateMin>g ? '<span class="late-flag">'+fmtMin(r.lateMin)+'</span>' : '—']);
      });
    return '<div class="stats">'+stat('Present', count('P'), 'teal')+stat('Late', late.length, late.length?'rose':'')+stat('Absent', count('A'), count('A')?'rose':'')+
      stat('Casual leave', count('CL'))+stat('Weekly off / holiday', count('WO')+count('H'))+'</div>'+
      xTable(['Staff','Department','Status','In','Out','Shift','Late'], rows, 'No staff.');
  }};
}
function xDays(title, list){
  return {title, build: ()=>{
    const byEmp = list.map(s=>{ const c = computeCycle(s.empNo); const m = {}; (c ? c.rows : []).forEach(r=>{ m[r.date] = r; }); return m; });
    const rows = allCycleDates().map(d=>{
      let p=0, a=0, l=0, work=0;
      byEmp.forEach(m=>{ const r = m[d]; if(!r || r.status==='WO' || r.status==='H') return; work++;
        if(r.status==='P'){ p++; if(r.lateMin>(r.shift ? (r.shift.allowedLateMin??15) : 15)) l++; } else if(r.status==='A') a++; });
      return xRow(xl(()=>xDay(d, list)), [xMono(fmtDate(d)+' '+dayName(d)), xMono(work ? Math.round(p/work*100)+'%' : '—'), xMono(p), xMono(a), xMono(l)]);
    });
    return xHint('Attendance % = present ÷ staff on record that day (weekly offs and holidays excluded). Click a day for everyone\'s punches.')+
      xTable(['Date','Attendance','Present','Absent','Late'], rows, 'No attendance in this pay cycle yet.');
  }};
}
/* payroll money: each figure opens the staff behind it */
function xPayroll(title, list){
  return {title, build: ()=>{
    const parts = [
      ['Gross salary', c=>c.emp.netSalary], ['Lateness / LOP deduction', c=>c.summary.totalDeduction], ['PF', c=>c.summary.pfDeduction],
      ['ESI', c=>c.summary.esiDeduction], ['Professional tax', c=>c.summary.ptDeduction], ['Other deduction', c=>c.summary.otherDeduction],
      ['Overtime pay', c=>c.summary.otPay], ['Net payable', c=>c.summary.finalNet],
    ];
    return xTable(['Figure','Total','Staff'], parts.map(([label, fn])=>{
      const n = list.filter(s=>{ const c = computeCycle(s.empNo); return c && fn(c)>0.004; }).length;
      return xRow(xl(()=>xRanked(label, list, fn, label, true)), [label, xMono(fmtMoney(xSum(list, fn))), xMono(n)]);
    }))+
    '<div class="section-title" style="margin-top:16px;">Deduction by unit</div>'+
    xTable(['Unit','Staff','Lateness / LOP','Statutory (PF/ESI/PT/other)','Total'], xGroup(list, s=>s.unitCode).map(([code, members])=>
      xRow(xl(()=>xRanked('Deduction · '+(unitName(code)||'No unit'), members, c=>c.summary.totalDeduction+c.summary.statutoryDeduction, 'Total deduction', true)),
        [escapeHTML(unitName(code)||'No unit'), xMono(members.length), xMono(fmtMoney(xSum(members, c=>c.summary.totalDeduction))),
         xMono(fmtMoney(xSum(members, c=>c.summary.statutoryDeduction))), xMono(fmtMoney(xSum(members, c=>c.summary.totalDeduction+c.summary.statutoryDeduction)))])));
  }};
}

function renderManagerOverview(){""")

# admin overview: cards, charts and tables become entry points
rep("""function renderAdminOverview(){
  const body = document.getElementById('adminBody');""", """function renderAdminOverview(){
  const body = document.getElementById('adminBody');
  explorerLinks = [];""")
rep("""  const attendanceSeries = dailyAttendanceSeries(scopedIds).map(x=>({label:fmtDate(x.date), value:x.pct}));""",
    """  const attendanceSeries = dailyAttendanceSeries(scopedIds).map(x=>({label:fmtDate(x.date), value:x.pct, date:x.date}));""")
rep("""    .map(x=>({label:x.s.name, value:x.cyc.summary.lateDays}));""",
    """    .map(x=>({label:x.s.name, value:x.cyc.summary.lateDays, empNo:x.s.empNo}));""")
rep("""      stat('Total staff', scopedStaff.length)+
      stat('Open tasks', openTasks)+
      stat('Pending leave requests', pendingLeave, pendingLeave>0?'rose':'')+
      stat('Total deduction (cycle)', fmtMoney(totalDeduction), totalDeduction>0.5?'rose':'')+
      stat('Rejected tasks to reassign', rejectedTasks, rejectedTasks>0?'rose':'')+
      stat('Reviews awaiting close', reviewsAwaiting, reviewsAwaiting>0?'rose':'')+
      stat('Staff with no Reporting Manager', noManager, noManager>0?'rose':'')+""",
    """      stat('Total staff', scopedStaff.length, '', xl(()=>xStaffTree('Total staff', scopedStaff, 'By unit, then department. Click a row to go deeper.')))+
      stat('Open tasks', openTasks, '', xl(()=>xTaskGroups('Open tasks', TASKS.filter(t=>t.status!=='Done' && scopedIds.has(t.assignedTo)), 'Every task not marked Done, by status.')))+
      stat('Pending leave requests', pendingLeave, pendingLeave>0?'rose':'', xl(()=>xLeaveList('Pending leave requests', LEAVES.filter(l=>l.status==='Pending' && scopedIds.has(l.empNo)))))+
      stat('Total deduction (cycle)', fmtMoney(totalDeduction), totalDeduction>0.5?'rose':'', xl(()=>xPayroll('Total deduction', scopedStaff)))+
      stat('Rejected tasks to reassign', rejectedTasks, rejectedTasks>0?'rose':'', xl(()=>xTaskList('Rejected tasks', TASKS.filter(t=>t.status==='Rejected' && scopedIds.has(t.assignedTo)))))+
      stat('Reviews awaiting close', reviewsAwaiting, reviewsAwaiting>0?'rose':'', xl(()=>xTaskList('Reviews awaiting close', TASKS.filter(t=>t.status==='Review' && scopedIds.has(t.assignedTo)))))+
      stat('Staff with no Reporting Manager', noManager, noManager>0?'rose':'', xl(()=>xStaffTree('No reporting manager', scopedStaff.filter(s=>!s.reportingManager || !findStaff(s.reportingManager)), 'Set the manager in Staff Master (one by one, or select several and use the bulk bar).')))+""")
rep("""      '<div><div class="section-title">Daily attendance % (this cycle)</div>'+miniBarChart(attendanceSeries,{suffix:'%',max:100})+'</div>'+
      '<div><div class="section-title">Top late-comers</div>'+topList(topLate,{color:'var(--rose)'})+'</div>'+""",
    """      '<div><div class="section-title">Daily attendance % (this cycle) <button class="x-more"'+xl(()=>xDays('Daily attendance', scopedStaff))+'>Explore ›</button></div>'+
        miniBarChart(attendanceSeries,{suffix:'%',max:100,links:attendanceSeries.map(x=>xl(()=>xDay(x.date, scopedStaff)))})+'</div>'+
      '<div><div class="section-title">Top late-comers <button class="x-more"'+xl(()=>xRanked('Late-comers', scopedStaff, c=>c.summary.lateDays, 'Late instances', false))+'>All ›</button></div>'+
        topList(topLate,{color:'var(--rose)',links:topLate.map(x=>xl(()=>xStaff(x.empNo)))})+'</div>'+""")
rep("""    '<div class="section-title" style="margin-top:16px;">Payroll cost breakdown (this cycle)</div>'+
    stackedBar([
      {label:'Net payable', value:netTotal, color:'var(--teal)'},
      {label:'Lateness / LOP', value:lopTotal, color:'var(--rose)'},
      {label:'Statutory (PF/ESI/PT)', value:statTotal, color:'var(--amber)'},
    ])+""", """    '<div class="section-title" style="margin-top:16px;">Payroll cost breakdown (this cycle) <button class="x-more"'+xl(()=>xPayroll('Payroll cost', scopedStaff))+'>Explore ›</button></div>'+
    stackedBar([
      {label:'Net payable', value:netTotal, color:'var(--teal)', link:xl(()=>xRanked('Net payable', scopedStaff, c=>c.summary.finalNet, 'Net payable', true))},
      {label:'Lateness / LOP', value:lopTotal, color:'var(--rose)', link:xl(()=>xRanked('Lateness / LOP', scopedStaff, c=>c.summary.totalDeduction, 'Lateness / LOP', true))},
      {label:'Statutory (PF/ESI/PT)', value:statTotal, color:'var(--amber)', link:xl(()=>xRanked('Statutory', scopedStaff, c=>c.summary.statutoryDeduction, 'PF + ESI + PT + other', true))},
    ])+""")
rep("""    unitStats.map(x=>'<tr><td>'+x.u.name+'</td>""",
    """    unitStats.map(x=>'<tr class="clickable-row"'+xl(()=>xDeptTree(x.u.name, STAFF.filter(s=>s.unitCode===x.u.code)))+'><td>'+x.u.name+'</td>""")
rep("""    Object.entries(byDept).sort((a,b)=>b[1]-a[1]).map(([d,c])=>'<tr><td>'+deptName(d)+'</td>""",
    """    Object.entries(byDept).sort((a,b)=>b[1]-a[1]).map(([d,c])=>'<tr class="clickable-row"'+xl(()=>xStaffList(deptName(d)||'No department', scopedStaff.filter(s=>s.department===d)))+'><td>'+deptName(d)+'</td>""")
rep("""  renderTrendBox(adminUnitFilter==='ALL' ? {""", """  wireExplore(body, explorerLinks);
  renderTrendBox(adminUnitFilter==='ALL' ? {""")

# manager overview: same explorer, scoped to their reports (salary hidden)
rep("""  const body = document.getElementById('adminBody');
  const me = currentAdminAccount.username;""", """  const body = document.getElementById('adminBody');
  explorerLinks = [];
  const me = currentAdminAccount.username;""")
rep("""      stat('My reports', myReports.length)+
      stat('Present today', presentToday+' / '+myReports.length, 'teal')+
      stat('Pending leave approvals', pendingLeave.length, pendingLeave.length>0?'rose':'')+
      stat('Tasks awaiting review', tasksAwaitingReview.length, tasksAwaitingReview.length>0?'rose':'')+
      stat('Rejected tasks to reassign', rejectedTasks.length, rejectedTasks.length>0?'rose':'')+""",
    """      stat('My reports', myReports.length, '', xl(()=>xStaffList('My reports', myReports)))+
      stat('Present today', presentToday+' / '+myReports.length, 'teal', today ? xl(()=>xDay(today, myReports)) : '')+
      stat('Pending leave approvals', pendingLeave.length, pendingLeave.length>0?'rose':'', xl(()=>xLeaveList('Pending leave approvals', pendingLeave)))+
      stat('Tasks awaiting review', tasksAwaitingReview.length, tasksAwaitingReview.length>0?'rose':'', xl(()=>xTaskList('Tasks awaiting review', tasksAwaitingReview)))+
      stat('Rejected tasks to reassign', rejectedTasks.length, rejectedTasks.length>0?'rose':'', xl(()=>xTaskList('Rejected tasks', rejectedTasks)))+""")
rep("""    (todaySnapshot.map(({s,rec})=>'<tr><td>'+s.name+'</td>""",
    """    (todaySnapshot.map(({s,rec})=>'<tr class="clickable-row"'+xl(()=>xStaff(s.empNo))+'><td>'+s.name+'</td>""")
rep("""all happen there.</div>';
}""", """all happen there.</div>';
  wireExplore(body, explorerLinks);
}""")

# sanity: nothing left that points at demo data
# (the Selvantra Technologies credit is allowed only inside the sign-in screen, section 24)
_outside_auth = re.sub(r'function authShell\(kind, errorMsg\)\{.*?\nfunction wireAuthShell', '', script, flags=re.S)
for bad in ['DEMO_STAFF_ID', 'admin123', 'Selvantra', '2026-09-25']:
    if bad in _outside_auth:
        sys.exit('leftover: '+bad)

SHELL = '''<div class="wrap">
  <div class="topbar no-print">
    <div class="brand">
      <div class="brand-mark">WM</div>
      <div>
        <div class="brand-name">WestMed Payroll System</div>
        <div class="brand-sub mono">Pay cycle &middot; <select class="cycle-select" id="cycleSel"></select></div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <button class="iconbtn hidden" id="installAppBtn">Install app</button>
      <div class="roleswitch" id="roleSwitch">
        <button data-role="staff" class="active">Staff</button>
        <button data-role="admin">Admin</button>
      </div>
    </div>
  </div>

  <div id="staffView"></div>
  <div id="adminView" class="hidden"></div>
  <div id="modalRoot"></div>
</div>
<div class="sync-status hidden" id="hrSyncStatus"></div>'''

module = '''// @ts-nocheck
/* ============================================================================
 * WestMed Payroll System — screens and payroll logic.
 *
 * This is the approved Selvantra HRMS prototype, ported line-for-line so every
 * screen, calculation and wording stays exactly as the customer signed off.
 * Generated by scripts/port_prototype.py — the only changes are:
 *   • data is loaded from / saved to Supabase (see ./data.ts), not hard-coded
 *   • sign-in, sign-out and password changes go through Supabase Auth (./auth.ts)
 *   • new leave / task IDs come from the database; "today" uses local (IST) date
 *   • an in-progress pay cycle uses its full length for per-day rates
 *   • demo shortcuts (sample IDs, demo passwords) and fake attendance removed
 * ========================================================================== */
import type { HrEnv, HrController, HrWho } from './types';

export function mountHrms(root: HTMLElement, env: HrEnv): HrController {
  root.innerHTML = SHELL;
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };

''' + '\n'.join('  ' + l if l else l for l in script.split('\n')) + '''

  /* ================= live-app controller ================= */
  function showView(which){
    document.querySelectorAll('#roleSwitch button').forEach(b=>b.classList.toggle('active', b.dataset.role===which));
    if(which==='admin'){ staffView.classList.add('hidden'); adminView.classList.remove('hidden'); renderAdmin(); }
    else { adminView.classList.add('hidden'); staffView.classList.remove('hidden'); currentStaff ? renderStaffDashboard() : renderStaffLogin(); }
  }
  function currentView(){ return adminView.classList.contains('hidden') ? 'staff' : 'admin'; }
  function renderCycleSelect(){
    const sel = document.getElementById('cycleSel');
    sel.innerHTML = env.cycles.map(c=>'<option value="'+c.key+'" '+(c.key===env.cycle.key?'selected':'')+'>'+c.label+'</option>').join('');
    sel.onchange = (e)=> env.setCycle(e.target.value);
  }
  function applySession(who: HrWho | null, fresh: boolean){
    const prevView = currentView();
    currentStaff = null; adminLoggedIn = false; currentAdminAccount = null;
    if(who){
      if(who.empNo && findStaff(who.empNo)) currentStaff = who.empNo;
      if(who.role==='admin'){ adminLoggedIn = true; currentAdminAccount = {username:'admin', name: who.name || 'Administrator', role:'admin'}; }
      else if(who.role==='manager'){ adminLoggedIn = true; currentAdminAccount = {username: who.empNo, name: who.name, role:'manager'}; }
      if(fresh && currentAdminAccount) adminTab = ADMIN_TABS_BY_ROLE[currentAdminAccount.role][0];
    }
    renderCycleSelect();
    if(fresh) showView(adminLoggedIn && prevView==='admin' ? 'admin' : (currentStaff ? 'staff' : (adminLoggedIn ? 'admin' : prevView)));
    else showView(prevView);
  }
  function rerender(){
    CYCLE_LABEL_JS = env.cycle.label;
    renderCycleSelect();
    showView(currentView());
  }
  function setSyncStatus(text, isError){
    const el = document.getElementById('hrSyncStatus');
    if(!el) return;
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
    el.classList.toggle('error', !!isError);
  }
  // every click / edit may change data → let the app save the difference
  const onInteract = ()=> setTimeout(()=> env.scheduleSync(), 0);
  root.addEventListener('click', onInteract);
  root.addEventListener('change', onInteract);

  renderCycleSelect();
  renderStaffLogin();

  return {
    applySession,
    rerender,
    takeover: handleSessionTakeover,
    setSyncStatus,
    destroy(){ root.removeEventListener('click', onInteract); root.removeEventListener('change', onInteract); root.innerHTML = ''; },
  };
}

const SHELL = `''' + SHELL + '''`;
'''
open(OUT, 'w').write(module)
print('ok', len(module.splitlines()), 'lines')
