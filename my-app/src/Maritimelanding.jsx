import { useMemo, useState } from "react";

/* ==================================================================
   1. EDIT ME: copy
   ================================================================== */
const CONTENT = {
  brand: "Seavik",
  headline: ["Maritime", "brokerage", "& chartering"],
  intro:
    "We broker offshore support vessels, barges and tugs, and buy and sell commercial vessels worldwide. Send us a route, a parcel or a vessel you have open, and a broker will reply within one business day.",
  email: "ops@seavik.com",
  phone: "+44 7835 592674",

  // Picture behind the enquiry form. To be safe from hotlink blocking and
  // licensing problems, save a picture you own into your project (for
  // example /public/hero.gif) and point this at "/hero.gif".
  image:
    "https://media.newyorker.com/photos/643d8574d73b3d81aa0e371d/4:3/w_1280,h_960,c_limit/Kennedy_Cargo_Sailboats.gif",

  services: [
    {
      kind: "osv",
      title: "Offshore Support Vessels (OSVs)",
      offeredLabel: "Vessels offered",
      offered: "Platform Supply Vessels (PSVs) and Anchor Handling Tug Supply (AHTS).",
      handles:
        "Chartering, towing, anchor handling, and offshore platform supply operations.",
    },
    {
      kind: "barge",
      title: "Cargo & Barges",
      offeredLabel: "Vessels offered",
      offered: "Flat-deck barges, hopper barges, and ocean towing tugs.",
      handles:
        "Shallow-water freight transport, heavy-lift equipment moving, and dry-bulk cargo logistics.",
    },
    {
      kind: "sp",
      title: "Vessel Sale & Purchase (S&P)",
      offeredLabel: "Services offered",
      offered: "Fleet acquisitions, disposals, and valuations.",
      handles:
        "Direct brokerage for buying and selling commercial vessels and offshore assets worldwide.",
    },
  ],

  legal: {
    name: "Seavik Ltd",
    number: "17453210",
    jurisdiction: "England and Wales",
    office: ["128 City Road", "London EC1V 2NX", "United Kingdom"],
  },
};

/* ==================================================================
   2. EDIT ME: email sending (free, no backend)
   ------------------------------------------------------------------
   Get a free access key at https://web3forms.com (type your email,
   the key arrives in your inbox). The key is safe to expose in
   frontend code. Paste it below, or pass it as the accessKey prop.
   ================================================================== */
const PLACEHOLDER_KEY = "YOUR_ACCESS_KEY_HERE";
const WEB3FORMS_ACCESS_KEY = PLACEHOLDER_KEY;

async function sendWithWeb3Forms(values, accessKey) {
  if (!accessKey || accessKey === PLACEHOLDER_KEY) {
    console.warn("Add your Web3Forms access key to send email.");
    throw new Error("no-key");
  }
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject: `New enquiry from ${values.name}`,
      from_name: `${CONTENT.brand} website`,
      name: values.name,
      email: values.email,
      cargo_or_vessel: values.cargo,
      message: values.message,
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "send-failed");
}

/* ==================================================================
   2b. EmailJS (used automatically once the three values are filled in)
   ------------------------------------------------------------------
   Dashboard: emailjs.com -> Email Services (Service ID),
   Email Templates (Template ID), Account (Public Key).
   Point TEMPLATE_ID at your "new enquiry" template (the one that
   emails YOU) and link the confirmation template in its Auto-Reply
   tab. Template variables: {{name}} {{email}} {{title}} {{message}} {{time}}
   ================================================================== */
const EMAILJS = {
  serviceId: "service_rsc8zh7", // Email Services tab
  templateId: "template_pg7lljk", // the "new message" template that emails you
  publicKey: "fo5LVgFVm0Nj7jDNc", // Account tab. Public keys are meant to be in frontend code.
};
const emailjsReady = () =>
  Object.values(EMAILJS).every((v) => v && !v.startsWith("YOUR_"));

async function sendWithEmailJS(values) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templateId,
      user_id: EMAILJS.publicKey,
      template_params: {
        name: values.name.trim(),
        email: values.email.trim(),
        title: values.cargo.trim() || "General enquiry",
        message: values.message.trim() || "No additional notes.",
        time: new Date().toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    }),
  });
  if (!res.ok) {
    const reason = await res.text().catch(() => "");
    console.error("EmailJS error:", res.status, reason);
    throw new Error("send-failed");
  }
}

// EmailJS if configured, otherwise Web3Forms.
function sendEnquiry(values, accessKey) {
  return emailjsReady()
    ? sendWithEmailJS(values)
    : sendWithWeb3Forms(values, accessKey);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { name: "", email: "", cargo: "", message: "", botcheck: false };

/* ==================================================================
   3. Component
   Props
     accessKey  Web3Forms key (overrides the constant above)
     onSubmit   Optional async (values) => void. Use this instead to
                send through your own API, EmailJS, Resend, etc.
   ================================================================== */
export default function SeavikLanding({ accessKey = WEB3FORMS_ACCESS_KEY, onSubmit }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [failure, setFailure] = useState("");
  const [sentTo, setSentTo] = useState({ name: "", email: "" });

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    []
  );

  const setField = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (status === "failed") setStatus("idle");
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Enter your name.";
    if (!values.email.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(values.email.trim()))
      next.email = "Enter a valid email address, like you@company.com.";
    if (!values.cargo.trim() && !values.message.trim())
      next.cargo = "Tell us the cargo, vessel or route.";
    return next;
  };

  const handleSubmit = async () => {
    if (status === "sending") return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Hidden spam trap: real people never tick it.
    if (values.botcheck) {
      setStatus("sent");
      return;
    }

    setStatus("sending");
    try {
      if (onSubmit) await onSubmit(values);
      else await sendEnquiry(values, accessKey);
      setSentTo({ name: values.name.trim(), email: values.email.trim() });
      setValues(EMPTY);
      setStatus("sent");
    } catch (err) {
      setFailure(
        err && err.message === "no-key"
          ? "Email sending isn't connected yet. Add your EmailJS or Web3Forms keys to the component."
          : `That didn't send. Try again, or email ${CONTENT.email}.`
      );
      setStatus("failed");
    }
  };

  const reset = () => {
    setStatus("idle");
    setFailure("");
  };

  return (
    <div className="sv-page">
      <style>{CSS}</style>

      <div className="sv-sheet">
        <header className="sv-header">
          <span className="sv-wordmark">{CONTENT.brand}</span>
          <nav className="sv-contact" aria-label="Page sections">
            <a href="#services">What we do</a>
            <a href="#enquiry">Send an enquiry</a>
          </nav>
        </header>

        <main className="sv-main">
          {/* ---------------- Left: what we do ---------------- */}
          <section className="sv-hero" aria-labelledby="sv-headline">
            <div>
              <h1 id="sv-headline" className="sv-headline">
                {CONTENT.headline.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h1>
              <span className="sv-horizon" aria-hidden="true" />
              <p className="sv-intro">{CONTENT.intro}</p>
            </div>

            <dl className="sv-reach">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${CONTENT.email}`}>{CONTENT.email}</a>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${CONTENT.phone.replace(/\s/g, "")}`}>{CONTENT.phone}</a>
                </dd>
              </div>
            </dl>
          </section>

          {/* ---------------- Right: enquiry form over a picture ---------------- */}
          <section
            id="enquiry"
            className="sv-photo"
            aria-labelledby="sv-slip-title"
            style={{ backgroundImage: `url("${CONTENT.image}")` }}
          >
            <div className="sv-slip" role="form" aria-labelledby="sv-slip-title">
              {status === "sent" ? (
                <div className="sv-done">
                  <h2 id="sv-slip-title" className="sv-slip-title">
                    Enquiry sent
                  </h2>
                  <p className="sv-done-text">
                    Thanks{sentTo.name ? `, ${sentTo.name}` : ""}. A broker will reply to{" "}
                    <strong>{sentTo.email}</strong> within one business day.
                  </p>
                  <button type="button" className="sv-button" onClick={reset}>
                    Send another enquiry
                  </button>
                </div>
              ) : (
                <>
                  <div className="sv-slip-head">
                    <h2 id="sv-slip-title" className="sv-slip-title">
                      Send an enquiry
                    </h2>
                    <time className="sv-date">{today}</time>
                  </div>
                  <p className="sv-slip-sub">A broker replies within one business day.</p>

                  <Field
                    id="sv-name"
                    label="Your name"
                    placeholder="Full name"
                    autoComplete="name"
                    value={values.name}
                    onChange={setField("name")}
                    error={errors.name}
                  />
                  <Field
                    id="sv-email"
                    label="Email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    value={values.email}
                    onChange={setField("email")}
                    error={errors.email}
                  />
                  <Field
                    id="sv-cargo"
                    label="Cargo, vessel or route"
                    placeholder="e.g. AHTS, North Sea, 3 months"
                    value={values.cargo}
                    onChange={setField("cargo")}
                    error={errors.cargo}
                  />
                  <Field
                    id="sv-message"
                    label="Anything else we should know"
                    multiline
                    value={values.message}
                    onChange={setField("message")}
                  />

                  {/* Spam trap: hidden from people, tempting to bots */}
                  <input
                    type="checkbox"
                    name="botcheck"
                    className="sv-trap"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    checked={values.botcheck}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, botcheck: e.target.checked }))
                    }
                  />

                  <button
                    type="button"
                    className="sv-button"
                    onClick={handleSubmit}
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Sending…" : "Send enquiry"}
                  </button>

                  <p className="sv-status" role="status" aria-live="polite">
                    {status === "failed" ? failure : ""}
                  </p>
                </>
              )}
            </div>
          </section>
        </main>

        {/* ---------------- What we do ---------------- */}
        <section id="services" className="sv-work" aria-labelledby="sv-work-title">
          <h2 id="sv-work-title" className="sv-work-title">
            What we do
          </h2>

          <div className="sv-work-grid">
            {CONTENT.services.map((s) => (
              <article key={s.title} className="sv-work-item">
                <VesselDrawing kind={s.kind} />
                <h3 className="sv-work-name">{s.title}</h3>
                <dl className="sv-particulars">
                  <div>
                    <dt>{s.offeredLabel}</dt>
                    <dd>{s.offered}</dd>
                  </div>
                  <div>
                    <dt>What we handle</dt>
                    <dd>{s.handles}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <footer className="sv-footer">
          <div className="sv-footer-block">
            <p className="sv-footer-name">{CONTENT.legal.name}</p>
            <p className="sv-footer-copy">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>

          <dl className="sv-footer-block">
            <dt>Company number</dt>
            <dd>{CONTENT.legal.number}</dd>
            <dt>Registered in</dt>
            <dd>{CONTENT.legal.jurisdiction}</dd>
          </dl>

          <dl className="sv-footer-block">
            <dt>Registered office</dt>
            <dd>
              {CONTENT.legal.office.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </dd>
          </dl>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/* Small side-view drawings: an offshore support vessel, a crane barge
   and a bulk carrier with a pennant. Drawn in black with a blue waterline. */
const WAVES =
  "M0 43 q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0";

const VESSELS = {
  osv: [
    "M4 26 H116 L108 38 H14 Z", // hull
    "M16 26 V13 H42 V26 M16 18 H42", // bridge and windows
    "M29 13 V5 M24 8 H34", // mast
    "M48 21 H112 M48 26 V21 M64 26 V21 M80 26 V21 M96 26 V21 M112 26 V21", // aft deck rails
  ],
  barge: [
    "M6 28 H114 L110 38 H10 Z", // hull
    "M20 28 V18 H46 V28", // cargo
    "M50 28 V12 H76 V28", // cargo
    "M98 28 V8 L82 22 M82 22 V27", // crane, boom and hook
  ],
  sp: [
    "M4 26 H116 L108 38 H14 Z", // hull
    "M14 26 V21 H28 V26 M32 26 V21 H46 V26 M50 26 V21 H64 V26 M68 26 V21 H82 V26", // hatches
    "M94 26 V12 H110 V26 M94 17 H110", // superstructure
    "M102 12 V3 M102 3 H114 L110 6.5 L114 10 H102", // mast and pennant
  ],
};

function VesselDrawing({ kind }) {
  return (
    <svg
      className="sv-vessel"
      viewBox="0 0 120 48"
      width="120"
      height="48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={WAVES} stroke="#2A5BD7" strokeWidth="1.4" />
      {(VESSELS[kind] || []).map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function Field({ id, label, multiline, error, ...inputProps }) {
  const Control = multiline ? "textarea" : "input";
  const errorId = `${id}-error`;
  return (
    <div className="sv-field">
      <label htmlFor={id} className="sv-label">
        {label}
      </label>
      <Control
        id={id}
        className={`sv-control${multiline ? " is-ruled" : ""}${error ? " has-error" : ""}`}
        rows={multiline ? 3 : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="sv-error">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap");

.sv-page {
  --cyan: #51d4f0;
  --navy: #0a1b44;
  --white: #ffffff;
  --black: #000000;
  --blue: #2a5bd7;
  --soft: #cfd8f0;
  --line: rgba(0, 0, 0, 0.18);
  --alert: #ff9c94;

  --sans: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;

  min-height: 100vh;
  box-sizing: border-box;
  background: var(--white);
  color: var(--black);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
.sv-page *, .sv-page *::before, .sv-page *::after { box-sizing: inherit; }

.sv-sheet {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  min-height: 100vh;
}

/* Header */
.sv-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 32px;
  padding: 22px 48px;
  border-bottom: 1px solid var(--line);
}
.sv-wordmark {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}
.sv-contact { display: flex; flex-wrap: wrap; gap: 8px 36px; }
.sv-contact a {
  padding-bottom: 3px;
  color: var(--black);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.sv-contact a:hover { color: var(--blue); border-bottom-color: var(--blue); }
.sv-contact a:focus-visible,
.sv-reach a:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}

/* Two columns */
.sv-main {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
}

/* Hero */
.sv-hero {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 64px;
  padding: 88px 56px 48px 48px;
}
.sv-headline {
  margin: 0;
  display: flex;
  flex-direction: column;
  font-size: clamp(2.6rem, 5.2vw, 5.4rem);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.04em;
}
.sv-horizon {
  display: block;
  width: 100%;
  max-width: 560px;
  height: 2px;
  margin-top: 30px;
  background: var(--blue);
}
.sv-intro {
  margin: 28px 0 0;
  max-width: 42ch;
  font-size: 19px;
  font-weight: 500;
  line-height: 1.6;
}

.sv-reach {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 56px;
  padding-top: 22px;
  border-top: 1px solid var(--line);
}
.sv-reach dt {
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 500;
}
.sv-reach dd { margin: 0; font-size: 18px; font-weight: 600; }
.sv-reach a {
  color: var(--black);
  text-decoration: underline;
  text-decoration-color: var(--line);
  text-underline-offset: 4px;
}
.sv-reach a:hover { color: var(--blue); text-decoration-color: var(--blue); }

/* Picture panel + form */
.sv-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 48px;
  background-color: #2aa9c9; /* shows if the picture fails to load */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.sv-slip {
  width: 100%;
  max-width: 470px;
  padding: 36px 36px 32px;
  /* Lower the last number (0 to 1) for more see-through, raise it for less */
  background: rgba(10, 27, 68, 0.5);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: var(--white);
  text-shadow: none;
}
.sv-slip-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px 16px;
}
.sv-slip-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.sv-date { font-size: 13px; color: var(--soft); }
.sv-slip-sub {
  margin: 8px 0 26px;
  font-size: 15px;
  color: var(--soft);
}

.sv-field { margin-bottom: 18px; }
.sv-label {
  display: block;
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--soft);
}
.sv-control {
  display: block;
  width: 100%;
  height: 42px;
  padding: 0 2px;
  font: inherit;
  font-size: 17px;
  color: var(--white);
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 0;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.sv-control::placeholder { color: #8f9dc4; opacity: 1; }
.sv-control:focus { outline: none; }
.sv-control:focus-visible {
  background: rgba(81, 212, 240, 0.08);
  box-shadow: 0 1px 0 0 var(--cyan);
  border-bottom-color: var(--cyan);
}
.sv-control.has-error { border-bottom-color: var(--alert); }
.sv-control.is-ruled {
  height: auto;
  min-height: 96px;
  padding-top: 0;
  line-height: 32px;
  resize: vertical;
  background-image: repeating-linear-gradient(
    transparent 0 31px, rgba(255, 255, 255, 0.22) 31px 32px
  );
  background-attachment: local;
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
}
.sv-error {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--alert);
}

.sv-trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.sv-button {
  display: block;
  width: 100%;
  height: 52px;
  margin-top: 26px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--navy);
  background: var(--cyan);
  border: 0;
  border-radius: 0;
  cursor: pointer;
  text-shadow: none;
  transition: background-color 0.15s ease;
}
.sv-button:hover:not(:disabled) { background: var(--white); }
.sv-button:focus-visible {
  outline: 2px solid var(--white);
  outline-offset: 3px;
}
.sv-button:disabled { opacity: 0.65; cursor: progress; }

.sv-status {
  min-height: 22px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.4;
  color: var(--alert);
}

.sv-done-text {
  margin: 14px 0 8px;
  font-size: 17px;
  line-height: 1.55;
  color: var(--soft);
}
.sv-done-text strong { color: var(--white); font-weight: 600; }

/* What we do */
.sv-work {
  padding: 96px 48px 104px;
  border-top: 1px solid var(--line);
  scroll-margin-top: 12px;
}
.sv-work-title {
  margin: 0 0 48px;
  font-size: clamp(2rem, 3.4vw, 3.25rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
}
.sv-work-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 2px solid var(--black);
}
.sv-work-item {
  padding: 36px 36px 0;
  border-right: 1px solid var(--line);
}
.sv-work-item:first-child { padding-left: 0; }
.sv-work-item:last-child { padding-right: 0; border-right: 0; }
.sv-vessel {
  display: block;
  width: 168px;
  max-width: 100%;
  height: auto;
  margin-bottom: 28px;
  color: var(--black);
}
.sv-work-name {
  margin: 0 0 22px;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.sv-particulars { margin: 0; display: grid; gap: 18px; }
.sv-particulars dt {
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.sv-particulars dd {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.55;
}

/* Footer */
.sv-footer {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 24px 40px;
  padding: 40px 48px 44px;
  background: var(--navy);
  color: var(--soft);
  font-size: 14px;
  line-height: 1.6;
  text-shadow: none;
}
.sv-footer-block { margin: 0; }
.sv-footer-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--white);
}
.sv-footer-copy { margin: 8px 0 0; }
.sv-footer-block dt {
  font-size: 13px;
  font-weight: 500;
  color: var(--cyan);
}
.sv-footer-block dt:not(:first-child) { margin-top: 12px; }
.sv-footer-block dd { margin: 0; color: var(--white); }
.sv-footer-block dd span { display: block; }

/* Tablet and mobile */
@media (max-width: 960px) {
  .sv-header { padding: 18px 24px; }
  .sv-contact { gap: 8px 22px; }
  .sv-main { grid-template-columns: 1fr; }
  .sv-hero { padding: 56px 24px 48px; gap: 40px; }
  .sv-headline { font-size: clamp(2.3rem, 10vw, 4rem); }
  .sv-photo { padding: 40px 20px 48px; }
  .sv-slip { padding: 26px 22px 24px; }

  .sv-work { padding: 56px 24px 32px; }
  .sv-work-grid { grid-template-columns: 1fr; }
  .sv-work-item,
  .sv-work-item:first-child,
  .sv-work-item:last-child {
    padding: 28px 0 32px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .sv-work-item:last-child { border-bottom: 0; }

  .sv-footer { grid-template-columns: 1fr; padding: 32px 24px 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .sv-control, .sv-button { transition: none; }
}
`;