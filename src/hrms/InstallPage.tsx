import { useEffect, useMemo, useState } from 'react';
import './hrms.css';

/**
 * /install — the link HR sends to staff to install "Selvantra HRMS" on their phone.
 * Shows only what that phone needs: one-tap install (Android / Chrome), the Add to Home Screen
 * steps (iPhone Safari), "open this in Safari" (other iPhone browsers), or a QR code to scan
 * (computers). English and Tamil throughout. The installed app opens on / (staff sign-in, then
 * the employee's own dashboard).
 */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Kind = 'installed' | 'android' | 'ios-safari' | 'ios-other' | 'desktop';

const ua = () => navigator.userAgent || '';
const isIOS = () => /iphone|ipad|ipod/i.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isPhone = () => isIOS() || /android|mobile/i.test(ua());
// Safari itself (not Chrome / Firefox / Edge for iOS, not an in-app browser such as WhatsApp or Instagram)
const isIOSSafari = () => isIOS() && /safari/i.test(ua()) && !/crios|fxios|edgios|opios|gsa\/|fban|fbav|instagram|whatsapp|line\//i.test(ua());

function kindNow(): Kind {
  if (isStandalone()) return 'installed';
  if (isIOS()) return isIOSSafari() ? 'ios-safari' : 'ios-other';
  return isPhone() ? 'android' : 'desktop';
}

function Bi({ en, ta }: { en: React.ReactNode; ta: React.ReactNode }) {
  return (<><span className="ip-en">{en}</span><span className="ip-ta" lang="ta">{ta}</span></>);
}

export default function InstallPage() {
  const kind = useMemo(kindNow, []);
  const [prompt, setPrompt] = useState<Prompt | null>(() => (window as unknown as { __installPrompt?: Prompt }).__installPrompt || null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');
  const link = window.location.origin + '/install';

  useEffect(() => {
    document.title = 'Install Selvantra HRMS';
    const onPrompt = (e: Event) => { e.preventDefault(); (window as unknown as { __installPrompt?: Event }).__installPrompt = e; setPrompt(e as Prompt); };
    const onInstalled = () => setDone(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  useEffect(() => {
    if (kind !== 'desktop') return;
    import('qrcode-generator').then((mod) => {
      const qrcode = (mod as unknown as { default?: typeof mod }).default || mod;
      const q = (qrcode as unknown as (t: number, l: string) => { addData: (s: string) => void; make: () => void; createSvgTag: (o: object) => string })(0, 'M');
      q.addData(link); q.make();
      setQr(q.createSvgTag({ cellSize: 6, margin: 4, scalable: true }));
    }).catch(() => setQr(''));
  }, [kind, link]);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    try { const r = await prompt.userChoice; if (r.outcome === 'accepted') setDone(true); } catch { /* ignore */ }
    (window as unknown as { __installPrompt?: Event }).__installPrompt = undefined;
    setPrompt(null);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* ignore */ }
  };

  return (
    <div className="hrms-root ip">
      <main className="ip-card">
        <img className="ip-logo" src="/selvantra/icon-192.png" alt="" width={84} height={84} />
        <h1>Selvantra HRMS</h1>
        <p className="ip-sub"><Bi en="WestMed attendance, leave, tasks and payslip — on your phone" ta="வெஸ்ட்மெட் வருகை, விடுப்பு, பணிகள், சம்பளச் சீட்டு — உங்கள் போனில்" /></p>

        {(kind === 'installed' || done) && (
          <section className="ip-box ip-ok">
            <b><Bi en="The app is installed ✓" ta="செயலி நிறுவப்பட்டது ✓" /></b>
            <p><Bi en='Open "Selvantra HRMS" from your home screen and sign in with your Staff Code.' ta='முகப்புத் திரையில் "Selvantra HRMS" திறந்து உங்கள் ஸ்டாஃப் கோடு மூலம் உள்நுழையுங்கள்.' /></p>
            <a className="ip-btn" href="/?source=pwa"><Bi en="Open the app" ta="செயலியைத் திற" /></a>
          </section>
        )}

        {!done && kind === 'android' && (
          prompt ? (
            <section className="ip-box">
              <button className="ip-btn ip-big" onClick={install}><Bi en="Install the app" ta="செயலியை நிறுவுக" /></button>
              <p className="ip-hint"><Bi en='Then tap "Install" in the box that appears. The Selvantra icon is added to your home screen.' ta='பிறகு வரும் சாளரத்தில் "Install" அழுத்துங்கள். Selvantra ஐகான் உங்கள் முகப்புத் திரையில் சேர்க்கப்படும்.' /></p>
            </section>
          ) : (
            <section className="ip-box">
              <b><Bi en="Install from the browser menu" ta="பிரவுசர் மெனுவிலிருந்து நிறுவுங்கள்" /></b>
              <ol>
                <li><Bi en={<>Open this page in <b>Chrome</b>.</>} ta={<>இந்தப் பக்கத்தை <b>Chrome</b>-இல் திறங்கள்.</>} /></li>
                <li><Bi en={<>Tap the menu <b>⋮</b> (top right).</>} ta={<>மேலே வலதுபுறம் உள்ள <b>⋮</b> மெனுவை அழுத்துங்கள்.</>} /></li>
                <li><Bi en={<>Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b>.</>} ta={<><b>Install app</b> (அல்லது <b>Add to Home screen</b>), பிறகு <b>Install</b> அழுத்துங்கள்.</>} /></li>
              </ol>
              <p className="ip-hint"><Bi en="Already installed? Look for Selvantra HRMS on your home screen." ta="ஏற்கனவே நிறுவியுள்ளீர்களா? முகப்புத் திரையில் Selvantra HRMS-ஐப் பாருங்கள்." /></p>
            </section>
          )
        )}

        {!done && kind === 'ios-safari' && (
          <section className="ip-box">
            <b><Bi en="Add to your Home Screen" ta="முகப்புத் திரையில் சேர்க்கவும்" /></b>
            <ol>
              <li><Bi en={<>Tap the <b>Share</b> button <span className="ip-ico" aria-hidden>⬆︎</span> at the bottom of Safari.</>} ta={<>Safari-இன் கீழே உள்ள <b>Share</b> <span className="ip-ico" aria-hidden>⬆︎</span> பொத்தானை அழுத்துங்கள்.</>} /></li>
              <li><Bi en={<>Scroll down and tap <b>Add to Home Screen</b> <span className="ip-ico" aria-hidden>＋</span>.</>} ta={<>கீழே நகர்த்தி <b>Add to Home Screen</b> <span className="ip-ico" aria-hidden>＋</span> அழுத்துங்கள்.</>} /></li>
              <li><Bi en={<>Tap <b>Add</b> (top right).</>} ta={<>மேலே வலதுபுறம் <b>Add</b> அழுத்துங்கள்.</>} /></li>
            </ol>
          </section>
        )}

        {!done && kind === 'ios-other' && (
          <section className="ip-box">
            <b><Bi en="Open this link in Safari" ta="இந்த இணைப்பை Safari-இல் திறங்கள்" /></b>
            <p><Bi en="On iPhone, apps can only be added to the home screen from Safari. Copy the link, open Safari, paste it and follow the steps there." ta="ஐபோனில் Safari மூலம் மட்டுமே முகப்புத் திரையில் சேர்க்க முடியும். இணைப்பை நகலெடுத்து, Safari-ஐத் திறந்து ஒட்டி, அங்குள்ள வழிமுறைகளைப் பின்பற்றுங்கள்." /></p>
            <div className="ip-link">{link}</div>
            <button className="ip-btn" onClick={copy}>{copied ? <Bi en="Copied ✓" ta="நகலெடுக்கப்பட்டது ✓" /> : <Bi en="Copy link" ta="இணைப்பை நகலெடு" />}</button>
          </section>
        )}

        {!done && kind === 'desktop' && (
          <section className="ip-box">
            <b><Bi en="Scan with your phone" ta="உங்கள் போனில் ஸ்கேன் செய்யுங்கள்" /></b>
            <p><Bi en="Open your phone camera, point it at this code and tap the link." ta="போன் கேமராவைத் திறந்து இந்தக் குறியீட்டை நோக்கி, வரும் இணைப்பை அழுத்துங்கள்." /></p>
            {qr ? <div className="ip-qr" dangerouslySetInnerHTML={{ __html: qr }} /> : null}
            <div className="ip-link">{link}</div>
            {prompt ? <button className="ip-btn" onClick={install}><Bi en="Install on this computer" ta="இந்தக் கணினியில் நிறுவு" /></button> : null}
          </section>
        )}

        <a className="ip-continue" href="/"><Bi en="Continue in the browser" ta="பிரவுசரிலேயே தொடரவும்" /></a>
      </main>
      <footer className="ip-foot">
        <img src="/selvantra/selvantra-mark.jpg" alt="" width={20} height={20} /> Powered by <a href="https://selvantra.com" target="_blank" rel="noopener noreferrer">Selvantra Technologies</a>
      </footer>
    </div>
  );
}
