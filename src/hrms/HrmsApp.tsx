import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import './hrms.css';
import { mountHrms } from './prototype';
import { createStore, latestAttendanceDate } from './data';
import { staffSignIn, adminSignIn, signOut, changePassword, whoami, manageLogin } from './auth';
import { cycleContaining, cycleForKey, recentCycles, todayISO } from './cycle';
import type { HrController, HrCycle, HrEnv, HrWho } from './types';

const DEVICE_KEY = 'hr_device_id';
const deviceId = (() => {
  try {
    let id = sessionStorage.getItem(DEVICE_KEY);
    if (!id) { id = 'dev_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch {
    return 'dev_' + Math.random().toString(36).slice(2, 10);
  }
})();

/**
 * WestMed Payroll System — hosts the approved HRMS prototype (./prototype.ts) and wires it to
 * Supabase: sign-in, live data, saving every change, pay-cycle switching and single-device sessions.
 */
export default function HrmsApp() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const store = createStore();
    let startDay = 25;
    let cycles: HrCycle[] = recentCycles(startDay, 12);
    let cycle: HrCycle = cycles[0];
    let controller: HrController | null = null;
    let signedInUid: string | null = null;
    let loading: Promise<void> | null = null;
    let takenOver = false;
    let disposed = false;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    let statusTimer: ReturnType<typeof setTimeout> | null = null;
    let sessionChannel: ReturnType<typeof supabase.channel> | null = null;

    const status = (text: string, isError = false, clearAfter = 0) => {
      controller?.setSyncStatus(text, isError);
      if (statusTimer) clearTimeout(statusTimer);
      if (clearAfter) statusTimer = setTimeout(() => controller?.setSyncStatus(''), clearAfter);
    };

    const refreshCycles = () => {
      startDay = Number(store.data.PAYROLL_SETTINGS?.cycleStartDay) || 25;
      cycles = recentCycles(startDay, 12, cycle);
    };

    // ── single active session: newest device wins ──
    const claimSession = async (uid: string) => {
      await (supabase as any).from('hr_active_sessions')
        .upsert({ account: uid, device_id: deviceId, updated_at: new Date().toISOString() }, { onConflict: 'account' });
      if (sessionChannel) supabase.removeChannel(sessionChannel);
      sessionChannel = supabase
        .channel('hr-session-' + uid)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'hr_active_sessions', filter: `account=eq.${uid}` },
          (payload: any) => {
            const row = payload.new;
            if (row && row.device_id && row.device_id !== deviceId) {
              takenOver = true;
              store.clear();
              controller?.takeover();
              supabase.auth.signOut({ scope: 'local' });
            }
          })
        .subscribe();
    };
    const releaseSession = async () => {
      if (sessionChannel) { supabase.removeChannel(sessionChannel); sessionChannel = null; }
      if (signedInUid) {
        await (supabase as any).from('hr_active_sessions').delete()
          .eq('account', signedInUid).eq('device_id', deviceId);
      }
    };

    // ── accounts on a default / administrator-set password choose a new one before any data loads ──
    const askNewPassword = (who: HrWho) => new Promise<boolean>(resolve => {
      const wrap = document.createElement('div');
      wrap.innerHTML = ''
        + '<div class="modal-back np-back"><div class="modal narrow" role="dialog" aria-modal="true" aria-labelledby="npTitle">'
        + '<div class="modal-head"><h3 id="npTitle" style="font-size:15px;">Choose a new password</h3></div>'
        + '<div class="modal-body">'
        + '<div class="hint" style="margin-bottom:12px;"><span id="npName"></span>, for your security please choose your own password before continuing. '
        + 'It must be at least 6 characters and can\'t be your Staff Code.</div>'
        + '<div class="form-row"><label for="npCurrent">Current password</label><input id="npCurrent" type="password" autocomplete="current-password"></div>'
        + '<div class="form-row"><label for="npNew">New password</label><input id="npNew" type="password" autocomplete="new-password"></div>'
        + '<div class="form-row"><label for="npConfirm">Confirm new password</label><input id="npConfirm" type="password" autocomplete="new-password"></div>'
        + '<div class="error-text" id="npError" role="alert"></div>'
        + '<button class="btn" style="width:100%;" id="npSubmit">Save new password</button>'
        + '<div style="text-align:center;margin-top:12px;"><button class="iconbtn" id="npSignOut">Sign out</button></div>'
        + '</div></div></div>';
      root.appendChild(wrap);
      const $ = (id: string) => wrap.querySelector('#' + id) as HTMLInputElement;
      $('npName').textContent = who.name || 'Hello';
      $('npCurrent').focus();
      const done = (ok: boolean) => { wrap.remove(); resolve(ok); };
      const submit = async () => {
        const cur = $('npCurrent').value, nw = $('npNew').value, cf = $('npConfirm').value;
        const err = $('npError');
        if (!cur) { err.textContent = 'Enter your current password.'; return; }
        if (nw.length < 6) { err.textContent = 'New password must be at least 6 characters.'; return; }
        if (nw !== cf) { err.textContent = 'New password and confirmation do not match.'; return; }
        const btn = $('npSubmit') as unknown as HTMLButtonElement;
        btn.disabled = true; err.textContent = '';
        const r = await changePassword(true, cur, nw);
        btn.disabled = false;
        if (r && r.error) { err.textContent = r.error; return; }
        done(true);
      };
      $('npSubmit').onclick = submit;
      wrap.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
      $('npSignOut').onclick = async () => { done(false); await signOut(); };
      disposeOverlay = () => done(false);
    });
    let disposeOverlay: (() => void) | null = null;

    // ── sign-in → load everything → show the right workspace ──
    const onSignedIn = async (uid: string, fresh: boolean) => {
      if (signedInUid === uid && loading) return loading;
      signedInUid = uid;
      takenOver = false;
      loading = (async () => {
        let who: HrWho | null = null;
        try { who = await whoami(); } catch { who = null; }
        if (!who) {
          await supabase.auth.signOut();
          return;
        }
        if (who.mustChange) {
          status('');
          const changed = await askNewPassword(who);
          disposeOverlay = null;
          if (!changed || disposed) return;
          who = await whoami().catch(() => null);
          if (!who || who.mustChange) {
            status('Your new password could not be confirmed — please sign in again.', true);
            await supabase.auth.signOut();
            return;
          }
        }
        status('Loading…');
        const settings = await store.loadSettings();
        startDay = Number(settings?.cycleStartDay) || 25;
        const latest = await latestAttendanceDate().catch(() => null);
        const today = todayISO();
        cycle = cycleContaining(latest && latest < today ? latest : today, startDay);
        cycles = recentCycles(startDay, 12, cycle);
        await store.loadAll(who, cycle);
        if (disposed) return;
        controller?.applySession(who, fresh);
        status('');
        claimSession(uid).catch(() => undefined);
      })().catch(err => {
        status('Could not load data: ' + (err?.message || err), true);
      }).finally(() => { loading = null; });
      return loading;
    };

    const onSignedOut = () => {
      disposeOverlay?.();
      signedInUid = null;
      if (sessionChannel) { supabase.removeChannel(sessionChannel); sessionChannel = null; }
      store.clear();
      if (!takenOver) controller?.applySession(null, true);
    };

    // ── save every edit ──
    const runSync = async () => {
      if (!store.who || !store.hasPendingChanges()) return;
      status('Saving…');
      try {
        const before = startDay;
        const r = await store.sync();
        refreshCycles();
        if (startDay !== before) {
          // Payroll Settings changed the cycle start day → reopen the matching cycle
          cycle = cycleContaining(cycle.end, startDay);
          cycles = recentCycles(startDay, 12, cycle);
          await store.loadCycleRows(cycle);
          controller?.rerender();
        } else if (r.idsChanged) {
          controller?.rerender();
        }
        status('All changes saved', false, 1500);
      } catch (err: any) {
        status('Not saved — ' + (err?.message || err), true);
      }
    };

    const env: HrEnv = {
      data: store.data,
      auth: {
        staffSignIn,
        adminSignIn,
        changePassword,
        signOut: async () => {
          await runSync();
          await releaseSession().catch(() => undefined);
          await signOut();
        },
      },
      get orgName() { return store.data.PAYROLL_SETTINGS?.companyName || 'WestMed Hospital'; },
      tempId: (prefix: string) => store.tempId(prefix),
      get cycle() { return cycle; },
      get cycles() { return cycles; },
      setCycle: async (key: string) => {
        await runSync();
        cycle = cycleForKey(key, startDay);
        cycles = recentCycles(startDay, 12, cycle);
        status('Loading…');
        try {
          await store.loadCycleRows(cycle);
          status('');
        } catch (err: any) {
          status('Could not load cycle: ' + (err?.message || err), true);
        }
        controller?.rerender();
      },
      scheduleSync: () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(runSync, 350);
      },
      ensureAllLogins: () => manageLogin({ action: 'ensure_all' }),
      setStaffPassword: (empNo: string, password: string) => manageLogin({ action: 'set_password', emp_no: empNo, password }),

      // ── Phase 2 ──
      finalizeCycle: async (results: any[], byName: string) => {
        await runSync();
        status('Finalizing…');
        try {
          await store.finalizeCycle(cycle, results, byName);
          status('Cycle finalized', false, 2000);
        } catch (err: any) {
          status('Could not finalize — ' + (err?.message || err), true);
          throw err;
        }
      },
      reopenCycle: async () => {
        status('Reopening…');
        try {
          await store.reopenCycle(cycle);
          status('Cycle reopened', false, 2000);
        } catch (err: any) {
          status('Could not reopen — ' + (err?.message || err), true);
          throw err;
        }
      },
      trends: async (count: number) => {
        const [y, m] = cycle.key.split('-').map(Number);
        const list: HrCycle[] = [];
        for (let i = count - 1; i >= 0; i--) {
          const d = new Date(y, m - 1 - i, 1);
          list.push(cycleForKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, startDay));
        }
        return store.loadTrends(list);
      },
      afterImport: async () => {
        if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
        await runSync();
        status('Refreshing…');
        try {
          await store.loadCycleRows(cycle);
          status('Import saved', false, 2000);
        } catch (err: any) {
          status('Could not refresh — ' + (err?.message || err), true);
        }
        controller?.rerender();
      },
      excelToCsv: async (file: File) => {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false, dateNF: 'dd-mmm-yyyy' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_csv(ws, { blankrows: false, rawNumbers: false });
      },
    };

    controller = mountHrms(root, env);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { onSignedOut(); return; }
      if (event === 'SIGNED_IN' && session?.user && session.user.id !== signedInUid) {
        onSignedIn(session.user.id, true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) onSignedIn(data.session.user.id, true);
    });

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (store.who && store.hasPendingChanges()) {
        runSync();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      disposed = true;
      disposeOverlay?.();
      sub.subscription.unsubscribe();
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (syncTimer) clearTimeout(syncTimer);
      if (statusTimer) clearTimeout(statusTimer);
      if (sessionChannel) supabase.removeChannel(sessionChannel);
      controller?.destroy();
      controller = null;
    };
  }, []);

  return <div ref={rootRef} className="hrms-root" />;
}
