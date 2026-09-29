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

# sanity: nothing left that points at demo data
for bad in ['DEMO_STAFF_ID', 'admin123', 'Selvantra', '2026-09-25']:
    if bad in script:
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
