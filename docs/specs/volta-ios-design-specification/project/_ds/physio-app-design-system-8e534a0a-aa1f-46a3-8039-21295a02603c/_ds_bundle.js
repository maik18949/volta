/* @ds-bundle: {"format":3,"namespace":"PhysioAppDesignSystem_8e534a","components":[{"name":"FlagChip","sourcePath":"components/clinical/FlagChip.jsx"},{"name":"NrsSlider","sourcePath":"components/clinical/NrsSlider.jsx"},{"name":"PhaseStepper","sourcePath":"components/clinical/PhaseStepper.jsx"},{"name":"ProgressBar","sourcePath":"components/clinical/ProgressBar.jsx"},{"name":"TestStatusToggle","sourcePath":"components/clinical/TestStatusToggle.jsx"},{"name":"ValueReadout","sourcePath":"components/clinical/ValueReadout.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Select","sourcePath":"components/core/Select.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"Tabs","sourcePath":"components/core/Tabs.jsx"}],"sourceHashes":{"components/clinical/FlagChip.jsx":"77c112eaf3fc","components/clinical/NrsSlider.jsx":"d6404e53eab0","components/clinical/PhaseStepper.jsx":"9280ebff2e10","components/clinical/ProgressBar.jsx":"d4a788bde131","components/clinical/TestStatusToggle.jsx":"dd8baec467ae","components/clinical/ValueReadout.jsx":"39b6b5f932cb","components/core/Badge.jsx":"52d1c4e63aa6","components/core/Button.jsx":"d24f6efdd2e0","components/core/Card.jsx":"6badc0ad428e","components/core/Checkbox.jsx":"b292c5ec91b3","components/core/Input.jsx":"72efef332c14","components/core/Select.jsx":"9cb2ec835bd1","components/core/Switch.jsx":"dfc49ded162d","components/core/Tabs.jsx":"834519dc9453","ui_kits/physio-app/AnamnesePanel.jsx":"228d2372082d","ui_kits/physio-app/AppShell.jsx":"9051f43bf14d","ui_kits/physio-app/BefundScreen.jsx":"95fb94dce884","ui_kits/physio-app/BefundSummaryPanel.jsx":"ceb1f321c1c9","ui_kits/physio-app/BerichteScreen.jsx":"50c5371ca0f2","ui_kits/physio-app/GelenkePanel.jsx":"d48651267960","ui_kits/physio-app/ObjektivPanel.jsx":"f159165eee74","ui_kits/physio-app/PatientenScreen.jsx":"133ef1fc1c6b","ui_kits/physio-app/ReturnToSportScreen.jsx":"264651b97e30","ui_kits/physio-app/VerlaufScreen.jsx":"f7053035c72b","ui_kits/physio-app/data.jsx":"c2423a783dc3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PhysioAppDesignSystem_8e534a = window.PhysioAppDesignSystem_8e534a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/clinical/FlagChip.jsx
try { (() => {
/**
 * FlagChip — toggelbarer Screening-Flag-Chip (Red / Yellow Flag).
 * Inaktiv neutral; aktiv in der jeweiligen Flag-Farbe @12%.
 */
function FlagChip({
  type = 'red',
  active = false,
  onToggle,
  children
}) {
  const token = type === 'yellow' ? '--flag-yellow' : '--flag-red';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": active,
    onClick: () => onToggle && onToggle(!active),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      height: 32,
      padding: '0 12px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      borderRadius: 'var(--radius-full)',
      cursor: 'pointer',
      background: active ? `hsl(var(${token}) / 0.12)` : 'hsl(var(--muted))',
      color: active ? `hsl(var(${token}))` : 'hsl(var(--muted-foreground))',
      border: `1.5px solid ${active ? `hsl(var(${token}))` : 'transparent'}`,
      transition: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 'var(--radius-full)',
      flexShrink: 0,
      background: active ? `hsl(var(${token}))` : 'hsl(var(--muted-foreground))'
    }
  }), children);
}
Object.assign(__ds_scope, { FlagChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/clinical/FlagChip.jsx", error: String((e && e.message) || e) }); }

// components/clinical/NrsSlider.jsx
try { (() => {
/**
 * NrsSlider — numerische Schmerz-Ratingskala 0–10.
 * Gradient grün→orange→rot. Wert in IBM Plex Mono.
 * `emphasized` für Pflichteingabe in der Verlaufsdokumentation.
 */
function NrsSlider({
  value = 0,
  onChange,
  label = 'NRS',
  emphasized = false
}) {
  const pct = value / 10 * 100;
  // Farbe des aktuellen Werts entlang der Skala
  const stop = value <= 5 ? `hsl(var(--nrs-0))` : value <= 8 ? `hsl(var(--nrs-5))` : `hsl(var(--nrs-10))`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: emphasized ? 14 : 0,
      borderRadius: 'var(--radius)',
      background: emphasized ? 'hsl(var(--card))' : 'transparent',
      boxShadow: emphasized ? 'var(--shadow-focus)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'hsl(var(--foreground))'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--weight-medium)',
      letterSpacing: 'var(--tracking-mono)',
      color: stop
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, " / 10"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 28,
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 8,
      borderRadius: 'var(--radius-full)',
      background: 'linear-gradient(90deg, hsl(var(--nrs-0)), hsl(var(--nrs-5)) 50%, hsl(var(--nrs-10)))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: `calc(${pct}% - 11px)`,
      transform: 'translateY(-50%)',
      width: 22,
      height: 22,
      borderRadius: 'var(--radius-full)',
      background: '#fff',
      border: `3px solid ${stop}`,
      boxShadow: 'var(--shadow-sm)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "10",
    step: "1",
    value: value,
    onChange: e => onChange && onChange(Number(e.target.value)),
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      width: '100%',
      height: 28,
      margin: 0,
      opacity: 0,
      cursor: 'pointer'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, /*#__PURE__*/React.createElement("span", null, "0"), /*#__PURE__*/React.createElement("span", null, "5"), /*#__PURE__*/React.createElement("span", null, "10")));
}
Object.assign(__ds_scope, { NrsSlider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/clinical/NrsSlider.jsx", error: String((e && e.message) || e) }); }

// components/clinical/PhaseStepper.jsx
try { (() => {
const PHASES = [{
  key: 'anamnese',
  label: 'Anamnese',
  token: '--phase-anamnese'
}, {
  key: 'objektiv',
  label: 'Objektiv',
  token: '--phase-objektiv'
}, {
  key: 'gelenke',
  label: 'Gelenke',
  token: '--phase-gelenke'
}, {
  key: 'befund',
  label: 'Befund',
  token: '--phase-befund'
}, {
  key: 'planung',
  label: 'Planung',
  token: '--phase-planung'
}];

/**
 * PhaseStepper — vertikale Phasen-Navigation der Befundaufnahme.
 * Aktive Phase: Phasenfarbe @15%, linker 3px-Border, voller Farbtext.
 */
function PhaseStepper({
  phases = PHASES,
  active,
  onSelect,
  completed = []
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, phases.map((p, i) => {
    const isActive = p.key === active;
    const isDone = completed.includes(p.key);
    return /*#__PURE__*/React.createElement("button", {
      key: p.key,
      type: "button",
      onClick: () => onSelect && onSelect(p.key),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        width: '100%',
        height: 44,
        padding: '0 12px',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        background: isActive ? `hsl(var(${p.token}) / 0.15)` : 'transparent',
        borderLeft: `3px solid ${isActive ? `hsl(var(${p.token}))` : 'transparent'}`,
        border: isActive ? undefined : '1px solid transparent',
        transition: 'background var(--dur-fast) var(--ease-standard)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-semibold)',
        background: isActive ? `hsl(var(${p.token}))` : isDone ? `hsl(var(${p.token}) / 0.18)` : 'hsl(var(--muted))',
        color: isActive ? '#fff' : isDone ? `hsl(var(${p.token}))` : 'hsl(var(--muted-foreground))'
      }
    }, isDone ? '✓' : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-base)',
        fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-medium)',
        color: isActive ? `hsl(var(${p.token}))` : 'hsl(var(--muted-foreground))'
      }
    }, p.label));
  }));
}
Object.assign(__ds_scope, { PhaseStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/clinical/PhaseStepper.jsx", error: String((e && e.message) || e) }); }

// components/clinical/ProgressBar.jsx
try { (() => {
/**
 * ProgressBar — Fortschrittsbalken. width-transition 300ms.
 * `accent` setzt die Füllfarbe (Default: Primary), z.B. eine Phasenfarbe.
 */
function ProgressBar({
  value = 0,
  max = 100,
  accent = '--primary',
  label = null,
  showValue = false
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--foreground))'
    }
  }, Math.round(pct), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: 'var(--radius-full)',
      background: 'hsl(var(--muted))',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pct}%`,
      borderRadius: 'var(--radius-full)',
      background: `hsl(var(${accent}))`,
      transition: 'width var(--dur-progress) var(--ease-standard)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/clinical/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/clinical/TestStatusToggle.jsx
try { (() => {
/**
 * TestStatusToggle — klinischer Drei-Zustand-Toggle pro Test.
 * pos = pathologischer Befund · neg = unauffällig · n.d. = nicht durchgeführt.
 * Farbig NUR im aktiven Zustand. Touch-Target ≥ 44px.
 */
function TestStatusToggle({
  value = null,
  onChange,
  label = null,
  size = 'md'
}) {
  const opts = [{
    key: 'pos',
    text: 'pos',
    token: '--status-pos'
  }, {
    key: 'neg',
    text: 'neg',
    token: '--status-neg'
  }, {
    key: 'nd',
    text: 'n. d.',
    token: '--status-neutral'
  }];
  const h = size === 'sm' ? 36 : 44;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'hsl(var(--foreground))'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: 6
    }
  }, opts.map(o => {
    const active = value === o.key;
    return /*#__PURE__*/React.createElement("button", {
      key: o.key,
      type: "button",
      "aria-pressed": active,
      onClick: () => onChange && onChange(active ? null : o.key),
      style: {
        minWidth: h + 14,
        height: h,
        padding: '0 14px',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-semibold)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        background: active ? `hsl(var(${o.token}) / 0.12)` : 'transparent',
        color: active ? `hsl(var(${o.token}))` : 'hsl(var(--muted-foreground))',
        border: `1.5px solid ${active ? `hsl(var(${o.token}))` : 'hsl(var(--border))'}`,
        transition: 'none'
      }
    }, o.text);
  })));
}
Object.assign(__ds_scope, { TestStatusToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/clinical/TestStatusToggle.jsx", error: String((e && e.message) || e) }); }

// components/clinical/ValueReadout.jsx
try { (() => {
/**
 * ValueReadout — messbarer Wert gegen einen Cut-off.
 * Wert in IBM Plex Mono; Farbe kodiert Bestehen (grün) / Verfehlen (rot).
 */
function ValueReadout({
  label,
  value,
  unit = '%',
  cutoff = null,
  pass = null,
  size = 'md'
}) {
  const passed = pass === null ? null : pass;
  const color = passed === null ? 'hsl(var(--foreground))' : passed ? 'hsl(var(--status-neg))' : 'hsl(var(--status-pos))';
  const big = size === 'lg';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      padding: 12,
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)',
      borderLeft: passed === null ? '1px solid hsl(var(--border))' : `3px solid ${color}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 'var(--weight-semibold)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: big ? 'var(--text-3xl)' : 'var(--text-2xl)',
      fontWeight: 'var(--weight-medium)',
      letterSpacing: 'var(--tracking-mono)',
      color
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.6em',
      color: 'hsl(var(--muted-foreground))'
    }
  }, unit))), cutoff && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, "Cut-off ", cutoff));
}
Object.assign(__ds_scope, { ValueReadout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/clinical/ValueReadout.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — kompaktes Status-/Meta-Label.
 * `tone` deckt Shadcn-Neutraltöne ab; klinische Farben über `clinical`.
 */
function Badge({
  tone = 'neutral',
  clinical = null,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      bg: 'hsl(var(--muted))',
      fg: 'hsl(var(--muted-foreground))',
      bd: 'transparent'
    },
    primary: {
      bg: 'hsl(var(--accent))',
      fg: 'hsl(var(--accent-foreground))',
      bd: 'transparent'
    },
    outline: {
      bg: 'transparent',
      fg: 'hsl(var(--foreground))',
      bd: 'hsl(var(--border))'
    }
  };
  // klinische, semantisch belegte Töne
  const clinicalTones = {
    pos: '--status-pos',
    neg: '--status-neg',
    neutralStatus: '--status-neutral',
    red: '--flag-red',
    yellow: '--flag-yellow',
    anamnese: '--phase-anamnese',
    objektiv: '--phase-objektiv',
    gelenke: '--phase-gelenke',
    befund: '--phase-befund',
    planung: '--phase-planung'
  };
  let styleObj;
  if (clinical && clinicalTones[clinical]) {
    const v = clinicalTones[clinical];
    styleObj = {
      bg: `hsl(var(${v}) / 0.12)`,
      fg: `hsl(var(${v}))`,
      bd: `hsl(var(${v}) / 0.4)`
    };
  } else {
    const t = tones[tone] || tones.neutral;
    styleObj = {
      bg: t.bg,
      fg: t.fg,
      bd: t.bd
    };
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 9px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      lineHeight: 1,
      borderRadius: 'var(--radius-sm)',
      background: styleObj.bg,
      color: styleObj.fg,
      border: `1px solid ${styleObj.bd}`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — primäre Aktion und ihre Varianten.
 * Shadcn-kompatibel; Touch-Target ≥ 44px bei size="md".
 */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  iconLeft = null,
  iconRight = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      height: 34,
      padding: '0 12px',
      font: 'var(--text-sm)',
      gap: 6
    },
    md: {
      height: 40,
      padding: '0 16px',
      font: 'var(--text-base)',
      gap: 8
    },
    lg: {
      height: 44,
      padding: '0 20px',
      font: 'var(--text-md)',
      gap: 8
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      border: '1px solid transparent'
    },
    secondary: {
      background: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
      border: '1px solid hsl(var(--border))'
    },
    outline: {
      background: 'transparent',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--border))'
    },
    ghost: {
      background: 'transparent',
      color: 'hsl(var(--foreground))',
      border: '1px solid transparent'
    },
    destructive: {
      background: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))',
      border: '1px solid transparent'
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      minWidth: s.height,
      fontFamily: 'var(--font-sans)',
      fontSize: s.font,
      fontWeight: 'var(--weight-semibold)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      borderRadius: 'var(--radius)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
      ...v,
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — Surface-Container, hebt sich per Border + weichem Schatten ab.
 */
function Card({
  children,
  padding = 16,
  interactive = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding,
      transition: interactive ? 'box-shadow var(--dur-fast) var(--ease-standard)' : 'none',
      ...style
    }
  }, rest), children);
}

/** CardHeader — Titelzeile mit optionaler Aktion rechts. */
function CardHeader({
  title,
  subtitle = null,
  action = null,
  accent = null,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
      paddingLeft: accent ? 10 : 0,
      borderLeft: accent ? `3px solid hsl(var(${accent}))` : 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-tight)',
      color: accent ? `hsl(var(${accent}))` : 'hsl(var(--foreground))'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      marginTop: 2
    }
  }, subtitle)), action);
}
Object.assign(__ds_scope, { Card, CardHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Checkbox.jsx
try { (() => {
/**
 * Checkbox — quadratisch, Indigo aktiv. Für Return-to-Sport-Checklisten.
 */
function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  label = null,
  id,
  style = {}
}) {
  const cid = id || (label ? 'cb-' + String(label).replace(/\s+/g, '-').toLowerCase() : undefined);
  const box = /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "checkbox",
    "aria-checked": checked,
    id: cid,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 20,
      height: 20,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-sm)',
      border: `1.5px solid ${checked ? 'hsl(var(--primary))' : 'hsl(var(--input))'}`,
      background: checked ? 'hsl(var(--primary))' : 'hsl(var(--card))',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
      padding: 0,
      ...style
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2L4.8 8.5L9.5 3.5",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })));
  if (!label) return box;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, box, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)',
      color: 'hsl(var(--foreground))'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — einzeiliges Textfeld. `mono` für Zahlenwerte/Cut-offs.
 */
function Input({
  label = null,
  hint = null,
  invalid = false,
  mono = false,
  emphasized = false,
  id,
  style = {},
  ...rest
}) {
  const inputId = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'hsl(var(--foreground))'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    style: {
      height: 40,
      padding: '0 12px',
      width: '100%',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'hsl(var(--foreground))',
      background: 'hsl(var(--card))',
      border: `1px solid ${invalid ? 'hsl(var(--destructive))' : 'hsl(var(--input))'}`,
      borderRadius: 'var(--radius)',
      outline: 'none',
      boxShadow: emphasized ? 'var(--shadow-focus)' : 'none',
      transition: 'box-shadow var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
      ...style
    },
    onFocus: e => {
      if (!invalid) e.target.style.boxShadow = 'var(--shadow-focus)';
    },
    onBlur: e => {
      if (!emphasized) e.target.style.boxShadow = 'none';
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: invalid ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — gestyltes natives Dropdown mit Label.
 */
function Select({
  label = null,
  hint = null,
  options = [],
  value,
  onChange,
  id,
  style = {},
  ...rest
}) {
  const sid = id || (label ? 'sel-' + String(label).replace(/\s+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: sid,
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'hsl(var(--foreground))'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: sid,
    value: value,
    onChange: onChange,
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      height: 40,
      width: '100%',
      padding: '0 36px 0 12px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'hsl(var(--foreground))',
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--input))',
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
      outline: 'none',
      ...style
    }
  }, rest), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lbl = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lbl);
  })), /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none",
    style: {
      position: 'absolute',
      right: 12,
      top: 13,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3.5 5L7 8.5L10.5 5",
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Select.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
/**
 * Switch — Ein/Aus-Toggle. Indigo im aktiven Zustand.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label = null,
  id,
  style = {}
}) {
  const sid = id || (label ? 'sw-' + String(label).replace(/\s+/g, '-').toLowerCase() : undefined);
  const track = /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    id: sid,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: 'relative',
      width: 40,
      height: 24,
      flexShrink: 0,
      borderRadius: 'var(--radius-full)',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      background: checked ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)',
      transition: 'background var(--dur-fast) var(--ease-standard)',
      padding: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 19 : 3,
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-full)',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur-fast) var(--ease-standard)'
    }
  }));
  if (!label) return track;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: sid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, track, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)',
      color: 'hsl(var(--foreground))'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/core/Tabs.jsx
try { (() => {
/**
 * Tabs — horizontale Segment-Navigation (Underline-Stil).
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      borderBottom: '1px solid hsl(var(--border))',
      ...style
    }
  }, tabs.map(t => {
    const val = typeof t === 'string' ? t : t.value;
    const lbl = typeof t === 'string' ? t : t.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      onClick: () => onChange && onChange(val),
      style: {
        position: 'relative',
        height: 40,
        padding: '0 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? 'hsl(var(--primary))' : 'transparent'}`,
        marginBottom: -1,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
        color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
        transition: 'color var(--dur-fast) var(--ease-standard)'
      }
    }, lbl);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/AnamnesePanel.jsx
try { (() => {
// Phase 1 — Anamnese: Leitsymptom, Schmerzmechanismus, Ziel, Eingangs-NRS.
function AnamnesePanel({
  onNext
}) {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    Input,
    Select,
    NrsSlider
  } = NS;
  const a = window.PHYSIO.anamnese;
  const [ruhe, setRuhe] = React.useState(a.schmerzRuhe);
  const [belastung, setBelastung] = React.useState(a.schmerzBelastung);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.PhaseHead, {
    num: 1,
    label: "Anamnese",
    token: "--phase-anamnese",
    title: "Anamnese",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline"
    }, "Entwurf"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: onNext,
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-right",
        style: {
          width: 16,
          height: 16
        }
      })
    }, "Weiter zu Objektiv"))
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Leitsymptom & Mechanismus",
    subtitle: "Subjektive Schilderung des Patienten",
    accent: "--phase-anamnese"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Leitsymptom",
    defaultValue: a.leitsymptom
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Beginn",
    options: ['Akut, Sporttrauma', 'Akut, Unfall', 'Schleichend', 'Postoperativ'],
    defaultValue: a.beginn
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Aktuelle Phase",
    defaultValue: window.PHYSIO.patient.since,
    mono: true
  })), /*#__PURE__*/React.createElement(Input, {
    label: "Sch\xE4digungsmechanismus",
    defaultValue: a.mechanismus
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Bisheriger Verlauf",
    defaultValue: a.verlauf
  }))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Schmerz bei Erstkontakt",
    subtitle: "NRS in Ruhe und unter Belastung",
    accent: "--phase-anamnese"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(NrsSlider, {
    value: ruhe,
    onChange: setRuhe,
    label: "NRS in Ruhe"
  }), /*#__PURE__*/React.createElement(NrsSlider, {
    value: belastung,
    onChange: setBelastung,
    label: "NRS unter Belastung"
  }))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Therapieziel",
    subtitle: "Patientenrelevantes, funktionelles Ziel",
    accent: "--phase-anamnese"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Ziel",
    defaultValue: a.ziel
  })));
}
window.AnamnesePanel = AnamnesePanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/AnamnesePanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/AppShell.jsx
try { (() => {
// App-Shell: Sidebar-Navigation, Patient-Kontextleiste, Screen-Router.
function AppShell() {
  const {
    Badge
  } = window.PhysioAppDesignSystem_8e534a;
  const [screen, setScreen] = React.useState('patienten');
  const [befundPhase, setBefundPhase] = React.useState('objektiv');
  const p = window.PHYSIO.patient;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const nav = [{
    key: 'patienten',
    label: 'Patienten',
    icon: 'users'
  }, {
    key: 'befund',
    label: 'Befundaufnahme',
    icon: 'clipboard-list'
  }, {
    key: 'verlauf',
    label: 'Verlauf',
    icon: 'activity'
  }, {
    key: 'rts',
    label: 'Return-to-Sport',
    icon: 'target'
  }, {
    key: 'berichte',
    label: 'Berichte',
    icon: 'file-text'
  }];

  // Patient aus der Liste öffnen → Befundaufnahme, passende Phase.
  const openPatient = pat => {
    setBefundPhase(pat.phase === 'planung' ? 'planung' : pat.phase);
    setScreen('befund');
  };
  const showContext = screen !== 'patienten';
  let Screen;
  if (screen === 'patienten') Screen = () => /*#__PURE__*/React.createElement(window.PatientenScreen, {
    onOpen: openPatient
  });else if (screen === 'befund') Screen = () => /*#__PURE__*/React.createElement(window.BefundScreen, {
    phase: befundPhase,
    onPhase: setBefundPhase
  });else if (screen === 'verlauf') Screen = window.VerlaufScreen;else if (screen === 'rts') Screen = window.ReturnToSportScreen;else if (screen === 'berichte') Screen = window.BerichteScreen;else Screen = () => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      color: 'hsl(var(--muted-foreground))'
    }
  }, "Bereich \u201E", screen, "\" \u2014 im UI-Kit nicht ausgearbeitet.");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 232,
      flexShrink: 0,
      background: 'hsl(var(--card))',
      borderRight: '1px solid hsl(var(--border))',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '18px 18px 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius)',
      background: 'hsl(var(--primary))',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.03em'
    }
  }, "K"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 'var(--text-lg)',
      letterSpacing: '-0.02em'
    }
  }, "Klinova")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '4px 10px'
    }
  }, nav.map(n => {
    const active = n.key === screen;
    return /*#__PURE__*/React.createElement("button", {
      key: n.key,
      type: "button",
      onClick: () => setScreen(n.key),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        height: 40,
        padding: '0 12px',
        width: '100%',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        border: 'none',
        textAlign: 'left',
        background: active ? 'hsl(var(--accent))' : 'transparent',
        color: active ? 'hsl(var(--accent-foreground))' : 'hsl(var(--muted-foreground))',
        fontSize: 'var(--text-base)',
        fontWeight: active ? 600 : 500
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": n.icon,
      style: {
        width: 18,
        height: 18
      }
    }), n.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: '12px 16px',
      borderTop: '1px solid hsl(var(--border))',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-full)',
      background: 'hsl(var(--muted))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'hsl(var(--muted-foreground))'
    }
  }, "TK"), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 600
    }
  }, "T. Keller"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, "Praxis Keller")))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, showContext && /*#__PURE__*/React.createElement("header", {
    style: {
      flexShrink: 0,
      background: 'hsl(var(--card))',
      borderBottom: '1px solid hsl(var(--border))',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setScreen('patienten'),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: 'var(--radius)',
      border: '1px solid hsl(var(--border))',
      background: 'hsl(var(--card))',
      color: 'hsl(var(--muted-foreground))',
      cursor: 'pointer',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "arrow-left",
    style: {
      width: 16,
      height: 16
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-full)',
      background: 'hsl(var(--accent))',
      color: 'hsl(var(--accent-foreground))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      flexShrink: 0
    }
  }, "MB"), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 600
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, p.age, " J.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, p.diagnosis))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    clinical: "planung"
  }, p.phase), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      whiteSpace: 'nowrap'
    }
  }, "Einheit ", p.unit))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(Screen, null))));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/BefundScreen.jsx
try { (() => {
// Befundaufnahme — Phasen-Container. PhaseStepper + aktives Phasen-Panel.
function BefundScreen({
  phase: phaseProp,
  onPhase
}) {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    PhaseStepper,
    ProgressBar
  } = NS;
  const [phaseState, setPhaseState] = React.useState('objektiv');
  const phase = phaseProp || phaseState;
  const setPhase = onPhase || setPhaseState;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const order = ['anamnese', 'objektiv', 'gelenke', 'befund', 'planung'];
  const completed = order.slice(0, order.indexOf(phase));
  const panels = {
    anamnese: window.AnamnesePanel,
    objektiv: window.ObjektivPanel,
    gelenke: window.GelenkePanel,
    befund: window.BefundSummaryPanel,
    planung: window.PlanungPanel
  };
  const Panel = panels[phase] || (() => null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '236px 1fr',
      gap: 20,
      alignItems: 'start',
      maxWidth: 1120,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      position: 'sticky',
      top: 0
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 10
  }, /*#__PURE__*/React.createElement(PhaseStepper, {
    active: phase,
    completed: completed,
    onSelect: setPhase
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 14
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 600,
      marginBottom: 10
    }
  }, "Fortschritt"), /*#__PURE__*/React.createElement(ProgressBar, {
    value: completed.length,
    max: 5,
    accent: "--primary",
    showValue: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      marginTop: 8
    }
  }, completed.length, " von 5 Phasen abgeschlossen"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    onNext: () => setPhase(order[Math.min(order.length - 1, order.indexOf(phase) + 1)])
  })));
}
window.BefundScreen = BefundScreen;

// Wiederverwendbarer Phasen-Kopf für die Panels.
function PhaseHead({
  num,
  label,
  token,
  title,
  actions
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 auto',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: `hsl(var(${token}))`,
      fontWeight: 700,
      whiteSpace: 'nowrap'
    }
  }, "Phase ", num, " \xB7 ", label), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-2xl)'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexShrink: 0
    }
  }, actions));
}
window.PhaseHead = PhaseHead;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/BefundScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/BefundSummaryPanel.jsx
try { (() => {
// Phase 4 — Befund: zusammenfassende klinische Hypothese & Ergebnisse.
function BefundSummaryPanel({
  onNext
}) {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    Badge,
    Input
  } = NS;
  const data = window.PHYSIO;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const auffaellig = data.tests.filter(t => t.status === 'pos');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.PhaseHead, {
    num: 4,
    label: "Befund",
    token: "--phase-befund",
    title: "Befund & Hypothese",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline"
    }, "Entwurf"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: onNext,
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-right",
        style: {
          width: 16,
          height: 16
        }
      })
    }, "Weiter zu Planung"))
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Klinische Hypothese",
    subtitle: "Synthese aus Anamnese, Untersuchung & Gelenkstatus",
    accent: "--phase-befund"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Arbeitshypothese",
    defaultValue: "Funktionelle Restinstabilit\xE4t bei guter Bandintegrit\xE4t; sekund\xE4r mediale Meniskusreizung."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Auff\xE4llige Tests",
    accent: "--phase-befund"
  }), auffaellig.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, "Keine pathologischen Befunde.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, auffaellig.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)',
      fontWeight: 600
    }
  }, t.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, t.region)), /*#__PURE__*/React.createElement(Badge, {
    clinical: "pos"
  }, "positiv"))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Bewegungseinschr\xE4nkung",
    accent: "--phase-befund"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, data.gelenke.movements.filter(m => m.limited).map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)',
      fontWeight: 500
    }
  }, m.name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'hsl(var(--muted-foreground))',
      fontSize: 'var(--text-sm)'
    }
  }, "(", m.side, ")")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-md)',
      color: 'hsl(var(--status-pos))'
    }
  }, m.value)))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Behandlungsplan",
    subtitle: "Abgeleitete Ma\xDFnahmen",
    accent: "--phase-befund"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Schwerpunkte",
    defaultValue: "Propriozeptions- & Stabilisationstraining, Quadrizeps-/Hamstring-Symmetrie, schrittweiser Belastungsaufbau."
  })));
}
window.BefundSummaryPanel = BefundSummaryPanel;

// Phase 5 — Planung: identisch zur Return-to-Sport-Bewertung (geteilter Body).
function PlanungPanel() {
  const {
    Badge
  } = window.PhysioAppDesignSystem_8e534a;
  const data = window.PHYSIO;
  const passed = data.rts.filter(r => r.pass).length;
  const ready = passed === data.rts.length;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.PhaseHead, {
    num: 5,
    label: "Planung",
    token: "--phase-planung",
    title: "Return-to-Sport",
    actions: /*#__PURE__*/React.createElement(Badge, {
      clinical: ready ? 'neg' : 'red',
      style: {
        height: 28,
        fontSize: 'var(--text-sm)'
      }
    }, ready ? 'Freigabe möglich' : 'Noch nicht freigegeben')
  }), /*#__PURE__*/React.createElement(window.RtsBody, null));
}
window.PlanungPanel = PlanungPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/BefundSummaryPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/BerichteScreen.jsx
try { (() => {
// Berichte — generierte Dokumente: Befund-, Verlaufs-, RTS-Bericht.
function BerichteScreen() {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    Badge
  } = NS;
  const data = window.PHYSIO;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const typeIcon = {
    'Befund': 'clipboard-list',
    'Verlauf': 'activity',
    'RTS': 'target'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 700,
      whiteSpace: 'nowrap'
    }
  }, data.patient.name, " \xB7 Knie re."), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-2xl)'
    }
  }, "Berichte")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "file-plus",
      style: {
        width: 16,
        height: 16
      }
    })
  }, "Bericht erstellen")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Aus Falldaten generieren",
    subtitle: "Vorlagen ziehen automatisch dokumentierte Werte"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12
    }
  }, [{
    t: 'Befundbericht',
    d: 'Anamnese, Untersuchung, Hypothese',
    icon: 'clipboard-list',
    tone: '--phase-objektiv'
  }, {
    t: 'Verlaufsbericht',
    d: 'NRS-Verlauf & Behandlungsnotizen',
    icon: 'activity',
    tone: '--phase-gelenke'
  }, {
    t: 'RTS-Bericht',
    d: 'Cut-offs & Freigabe-Checkliste',
    icon: 'target',
    tone: '--phase-planung'
  }].map(v => /*#__PURE__*/React.createElement("button", {
    key: v.t,
    type: "button",
    style: {
      textAlign: 'left',
      cursor: 'pointer',
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)',
      padding: 14
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = 'var(--shadow-md)',
    onMouseLeave: e => e.currentTarget.style.boxShadow = 'none'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius)',
      background: `hsl(var(${v.tone}) / 0.12)`,
      color: `hsl(var(${v.tone}))`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": v.icon,
    style: {
      width: 18,
      height: 18
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600
    }
  }, v.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      marginTop: 2
    }
  }, v.d))))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      borderBottom: '1px solid hsl(var(--border))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600
    }
  }, "Erstellte Berichte")), data.berichte.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: b.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '13px 16px',
      borderTop: i === 0 ? 'none' : '1px solid hsl(var(--border))'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius)',
      background: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": typeIcon[b.type],
    style: {
      width: 17,
      height: 17
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600
    }
  }, b.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, b.date)), /*#__PURE__*/React.createElement(Badge, {
    tone: b.status === 'final' ? 'primary' : 'neutral'
  }, b.status), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "download",
      style: {
        width: 15,
        height: 15
      }
    })
  }, "PDF")))));
}
window.BerichteScreen = BerichteScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/BerichteScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/GelenkePanel.jsx
try { (() => {
// Phase 3 — Gelenke: Bewegungsausmaß (Neutral-Null), Seitenvergleich, Endgefühl.
function GelenkePanel({
  onNext
}) {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    Select,
    Badge
  } = NS;
  const g = window.PHYSIO.gelenke;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.PhaseHead, {
    num: 3,
    label: "Gelenke",
    token: "--phase-gelenke",
    title: "Bewegungsausma\xDF",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline"
    }, "Entwurf"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: onNext,
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-right",
        style: {
          width: 16,
          height: 16
        }
      })
    }, "Weiter zu Befund"))
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Neutral-Null-Methode",
    subtitle: "Kniegelenk \xB7 Seitenvergleich gegen Norm",
    accent: "--phase-gelenke",
    action: /*#__PURE__*/React.createElement(Select, {
      options: ['Kniegelenk', 'Hüftgelenk', 'OSG'],
      defaultValue: "Kniegelenk"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 0.5fr 1fr 1fr',
      gap: 0,
      padding: '9px 12px',
      borderBottom: '1px solid hsl(var(--border))',
      background: 'hsl(var(--muted) / 0.5)',
      borderRadius: 'var(--radius) var(--radius) 0 0'
    }
  }, ['Bewegung', 'Seite', 'Messwert', 'Referenz'].map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 600
    }
  }, h))), g.movements.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 0.5fr 1fr 1fr',
      gap: 0,
      alignItems: 'center',
      padding: '11px 12px',
      borderBottom: '1px solid hsl(var(--border))'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)',
      fontWeight: 500
    }
  }, m.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, m.side), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-md)',
      fontWeight: 500,
      color: m.limited ? 'hsl(var(--status-pos))' : 'hsl(var(--foreground))'
    }
  }, m.value), m.limited && /*#__PURE__*/React.createElement(Badge, {
    clinical: "pos"
  }, "eingeschr\xE4nkt")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, m.ref))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--muted-foreground))',
      padding: '10px 12px 0'
    }
  }, "Werte in Grad nach Neutral-Null-Methode (Ext.\u20130\u2013Flex.).")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 600
    }
  }, "Endgef\xFChl"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 600,
      marginTop: 4
    }
  }, g.endgefuehl)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 600
    }
  }, "Schwellung"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 600,
      marginTop: 4
    }
  }, g.schwellung))));
}
window.GelenkePanel = GelenkePanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/GelenkePanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/ObjektivPanel.jsx
try { (() => {
// Phase 2 — Objektiv: Schmerz, Stabilitätstests, Screening-Flags.
function ObjektivPanel({
  onNext
}) {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    TestStatusToggle,
    NrsSlider,
    FlagChip
  } = NS;
  const data = window.PHYSIO;
  const [tests, setTests] = React.useState(() => data.tests.map(t => t.status));
  const [nrs, setNrs] = React.useState(2);
  const [flags, setFlags] = React.useState({
    red1: false,
    red2: false,
    yel1: true
  });
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const setTest = (i, v) => setTests(prev => prev.map((s, j) => j === i ? v : s));
  const done = tests.filter(s => s && s !== 'nd').length;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.PhaseHead, {
    num: 2,
    label: "Objektiv",
    token: "--phase-objektiv",
    title: "Objektive Untersuchung",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline"
    }, "Entwurf"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: onNext,
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-right",
        style: {
          width: 16,
          height: 16
        }
      })
    }, "Weiter zu Gelenke"))
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Schmerz & Belastung",
    subtitle: "NRS in Ruhe und unter Belastung",
    accent: "--phase-objektiv"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(NrsSlider, {
    value: nrs,
    onChange: setNrs,
    label: "NRS in Ruhe"
  }), /*#__PURE__*/React.createElement(NrsSlider, {
    value: 5,
    onChange: () => {},
    label: "NRS unter Belastung"
  }))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Stabilit\xE4ts- & Funktionstests",
    subtitle: `${done} auffällig dokumentiert`,
    accent: "--phase-objektiv",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "plus",
        style: {
          width: 15,
          height: 15
        }
      })
    }, "Test")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, data.tests.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '12px 0',
      borderTop: i === 0 ? 'none' : '1px solid hsl(var(--border))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600
    }
  }, t.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, t.region)), /*#__PURE__*/React.createElement(TestStatusToggle, {
    value: tests[i],
    onChange: v => setTest(i, v),
    size: "sm"
  }))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Screening-Flags",
    subtitle: "Red & Yellow Flags \u2014 vor Belastungsaufbau pr\xFCfen",
    accent: "--phase-objektiv"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(FlagChip, {
    type: "red",
    active: flags.red1,
    onToggle: v => setFlags(f => ({
      ...f,
      red1: v
    }))
  }, "N\xE4chtlicher Ruheschmerz"), /*#__PURE__*/React.createElement(FlagChip, {
    type: "red",
    active: flags.red2,
    onToggle: v => setFlags(f => ({
      ...f,
      red2: v
    }))
  }, "Gelenkerguss zunehmend"), /*#__PURE__*/React.createElement(FlagChip, {
    type: "yellow",
    active: flags.yel1,
    onToggle: v => setFlags(f => ({
      ...f,
      yel1: v
    }))
  }, "Angst-Vermeidungsverhalten"), /*#__PURE__*/React.createElement(FlagChip, {
    type: "yellow",
    active: false,
    onToggle: () => {}
  }, "Geringe Selbstwirksamkeit"))));
}
window.ObjektivPanel = ObjektivPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/ObjektivPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/PatientenScreen.jsx
try { (() => {
// Patientenliste — Top-Level Einstieg: Suche, Übersicht, Falltabelle.
function PatientenScreen({
  onOpen
}) {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    Button,
    Input,
    Badge
  } = NS;
  const data = window.PHYSIO;
  const phaseToken = {
    anamnese: '--phase-anamnese',
    objektiv: '--phase-objektiv',
    gelenke: '--phase-gelenke',
    befund: '--phase-befund',
    planung: '--phase-planung'
  };
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const list = data.patients.filter(p => (p.name + p.diagnosis + p.region).toLowerCase().includes(q.toLowerCase()));
  const aktiv = data.patients.filter(p => p.status === 'aktiv').length;
  const flags = data.patients.reduce((n, p) => n + p.flags, 0);
  const statusTone = {
    aktiv: 'neg',
    pause: 'neutralStatus',
    abgeschlossen: 'neutralStatus'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 700,
      whiteSpace: 'nowrap'
    }
  }, "Praxis Keller \xB7 06.06.2026"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-2xl)'
    }
  }, "Patienten")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "user-plus",
      style: {
        width: 16,
        height: 16
      }
    })
  }, "Neuer Patient")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12
    }
  }, [{
    k: 'Aktive Fälle',
    v: aktiv,
    icon: 'folder-open',
    tone: '--primary'
  }, {
    k: 'Termine heute',
    v: 1,
    icon: 'calendar-clock',
    tone: '--phase-objektiv'
  }, {
    k: 'Offene Flags',
    v: flags,
    icon: 'flag',
    tone: '--flag-red'
  }].map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.k,
    padding: 14
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius)',
      background: `hsl(var(${s.tone}) / 0.12)`,
      color: `hsl(var(${s.tone}))`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": s.icon,
    style: {
      width: 18,
      height: 18
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xl)',
      fontWeight: 500,
      lineHeight: 1
    }
  }, s.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      marginTop: 2
    }
  }, s.k)))))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderBottom: '1px solid hsl(var(--border))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    style: {
      width: 16,
      height: 16,
      position: 'absolute',
      left: 11,
      top: 12,
      color: 'hsl(var(--muted-foreground))'
    }
  }), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Patient, Diagnose, Region\u2026",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      paddingLeft: 34
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.7fr 1fr 1fr 0.9fr 0.6fr',
      gap: 0,
      padding: '9px 16px',
      borderBottom: '1px solid hsl(var(--border))',
      background: 'hsl(var(--muted) / 0.5)'
    }
  }, ['Patient', 'Phase', 'Nächster Termin', 'Status', ''].map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 600
    }
  }, h))), list.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onOpen && onOpen(p),
    style: {
      display: 'grid',
      gridTemplateColumns: '1.7fr 1fr 1fr 0.9fr 0.6fr',
      gap: 0,
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid hsl(var(--border))',
      cursor: 'pointer'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'hsl(var(--accent) / 0.5)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-full)',
      background: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      flexShrink: 0
    }
  }, p.name.split(' ').map(s => s[0]).join('')), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }
  }, p.name), p.flags > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      color: 'hsl(var(--flag-red))',
      fontSize: 'var(--text-2xs)',
      fontFamily: 'var(--font-mono)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "flag",
    style: {
      width: 11,
      height: 11
    }
  }), p.flags)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'hsl(var(--muted-foreground))',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, p.region, " \xB7 ", p.diagnosis))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
    clinical: p.phase
  }, p.phaseLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: p.next === '—' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
      fontFamily: p.next.includes(':') ? 'var(--font-mono)' : 'inherit'
    }
  }, p.next), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
    clinical: statusTone[p.status]
  }, p.status)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      color: 'hsl(var(--muted-foreground))'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-right",
    style: {
      width: 18,
      height: 18
    }
  }))))));
}
window.PatientenScreen = PatientenScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/PatientenScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/ReturnToSportScreen.jsx
try { (() => {
// Return-to-Sport — Cut-off-Werte & klinische Freigabe-Checkliste.
// RtsBody ist der geteilte Inhalt (Top-Level-Screen + Phase 5 „Planung").
function RtsBody() {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    ValueReadout,
    Checkbox,
    ProgressBar
  } = NS;
  const data = window.PHYSIO;
  const [checks, setChecks] = React.useState({
    c1: true,
    c2: true,
    c3: false,
    c4: false
  });
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const passed = data.rts.filter(r => r.pass).length;
  const total = data.rts.length;
  const ready = passed === total && Object.values(checks).every(Boolean);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Limb-Symmetry-Index & Hop-Tests",
    subtitle: `${passed} von ${total} Kriterien erreichen den Cut-off`,
    accent: "--phase-planung"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 10
    }
  }, data.rts.map(r => /*#__PURE__*/React.createElement(ValueReadout, {
    key: r.name,
    label: r.name,
    value: r.value,
    cutoff: r.cutoff,
    pass: r.pass
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: passed,
    max: total,
    accent: ready ? '--status-neg' : '--phase-planung',
    label: "Kriterien erf\xFCllt",
    showValue: true
  }))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Klinische Freigabe-Checkliste",
    subtitle: "Subjektive & funktionelle Kriterien",
    accent: "--phase-planung"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, [['c1', 'Schmerzfreiheit unter sportartspezifischer Belastung (NRS = 0)'], ['c2', 'Volle, seitengleiche Beweglichkeit (ROM)'], ['c3', 'Sportartspezifisches Agility-Training absolviert'], ['c4', 'Psychologische Bereitschaft (ACL-RSI ≥ 65)']].map(([key, label]) => /*#__PURE__*/React.createElement("label", {
    key: key,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 8px',
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
      background: checks[key] ? 'hsl(var(--phase-planung) / 0.06)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: checks[key],
    onChange: v => setChecks(c => ({
      ...c,
      [key]: v
    }))
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)',
      color: checks[key] ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'
    }
  }, label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Bericht exportieren"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: !ready,
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "shield-check",
      style: {
        width: 16,
        height: 16
      }
    })
  }, "Freigabe dokumentieren")));
}
window.RtsBody = RtsBody;

// Top-Level Return-to-Sport-Screen.
function ReturnToSportScreen() {
  const {
    Badge
  } = window.PhysioAppDesignSystem_8e534a;
  const data = window.PHYSIO;
  const passed = data.rts.filter(r => r.pass).length;
  const ready = passed === data.rts.length;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 700
    }
  }, "Bewertung"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-2xl)'
    }
  }, "Return-to-Sport-Bewertung")), /*#__PURE__*/React.createElement(Badge, {
    clinical: ready ? 'neg' : 'red',
    style: {
      height: 28,
      fontSize: 'var(--text-sm)'
    }
  }, ready ? 'Freigabe möglich' : 'Noch nicht freigegeben')), /*#__PURE__*/React.createElement(RtsBody, null));
}
window.ReturnToSportScreen = ReturnToSportScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/ReturnToSportScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/VerlaufScreen.jsx
try { (() => {
// Verlaufsdokumentation — schnelle tägliche Eintragsmaske (max. 3 Min.).
function VerlaufScreen() {
  const NS = window.PhysioAppDesignSystem_8e534a;
  const {
    Card,
    CardHeader,
    Button,
    Input,
    NrsSlider,
    Badge
  } = NS;
  const data = window.PHYSIO;
  const [nrs, setNrs] = React.useState(3);
  const [note, setNote] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [history, setHistory] = React.useState(data.verlauf);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const save = () => {
    setHistory(h => [{
      unit: data.patient.unit,
      date: '06.06.',
      nrs,
      note: note || '—'
    }, ...h]);
    setSaved(true);
    setNote('');
    setTimeout(() => setSaved(false), 1800);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: 20,
      alignItems: 'start',
      maxWidth: 1040,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 700
    }
  }, "Einheit ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, data.patient.unit), " \xB7 06.06.2026"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-2xl)'
    }
  }, "Verlaufseintrag")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600
    }
  }, "Schmerz heute"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'hsl(var(--muted-foreground))'
    }
  }, "Pflichteingabe")), /*#__PURE__*/React.createElement(NrsSlider, {
    value: nrs,
    onChange: setNrs,
    label: "NRS aktuell",
    emphasized: true
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(Input, {
    label: "Behandlungsnotiz",
    placeholder: "Ma\xDFnahmen, Reaktion, Auff\xE4lligkeiten\u2026",
    value: note,
    onChange: e => setNote(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 10,
      flexWrap: 'wrap'
    }
  }, ['Belastung gesteigert', 'Schwellung', 'Schmerzarm', 'Eigenübungen instruiert'].map(q => /*#__PURE__*/React.createElement("button", {
    key: q,
    type: "button",
    onClick: () => setNote(n => n ? n + ', ' + q.toLowerCase() : q),
    style: {
      height: 28,
      padding: '0 10px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid hsl(var(--border))',
      background: 'hsl(var(--card))',
      color: 'hsl(var(--muted-foreground))',
      fontSize: 'var(--text-xs)',
      fontWeight: 500,
      cursor: 'pointer'
    }
  }, "+ ", q)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: save,
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "check",
      style: {
        width: 17,
        height: 17
      }
    })
  }, "Eintrag speichern"), saved && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: 'hsl(var(--status-neg))',
      fontSize: 'var(--text-sm)',
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "check-circle-2",
    style: {
      width: 16,
      height: 16
    }
  }), " Gespeichert"))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      borderBottom: '1px solid hsl(var(--border))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 600
    }
  }, "Letzte Einheiten")), /*#__PURE__*/React.createElement("div", null, history.map((h, i) => {
    const tone = h.nrs <= 3 ? '--status-neg' : h.nrs <= 6 ? '--flag-yellow' : '--status-pos';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        borderTop: i === 0 ? 'none' : '1px solid hsl(var(--border))'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        width: 44
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-2xs)',
        color: 'hsl(var(--muted-foreground))'
      }
    }, "E", h.unit), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xl)',
        fontWeight: 500,
        color: `hsl(var(${tone}))`
      }
    }, h.nrs)), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-xs)',
        color: 'hsl(var(--muted-foreground))',
        fontFamily: 'var(--font-mono)'
      }
    }, h.date), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-sm)',
        marginTop: 2
      }
    }, h.note)));
  }))));
}
window.VerlaufScreen = VerlaufScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/VerlaufScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/physio-app/data.jsx
try { (() => {
// Mock-Daten für das Klinova UI-Kit (kein echtes Backend).
window.PHYSIO = {
  patient: {
    name: 'M. Brandner',
    age: 28,
    diagnosis: 'VKB-Ruptur Knie rechts, Z. n. Rekonstruktion',
    since: '12. Woche post-OP',
    phase: 'Aufbau / Return-to-Sport',
    unit: 14
  },
  // Patientenliste (Top-Level)
  patients: [{
    id: 1,
    name: 'M. Brandner',
    age: 28,
    region: 'Knie re.',
    diagnosis: 'VKB-Ruptur, Z. n. Rekonstruktion',
    phase: 'planung',
    phaseLabel: 'Return-to-Sport',
    unit: 14,
    next: 'Heute 14:30',
    flags: 1,
    status: 'aktiv'
  }, {
    id: 2,
    name: 'S. Aydin',
    age: 41,
    region: 'Schulter li.',
    diagnosis: 'Subakromiales Impingement',
    phase: 'objektiv',
    phaseLabel: 'Befund',
    unit: 3,
    next: 'Mo 09:00',
    flags: 0,
    status: 'aktiv'
  }, {
    id: 3,
    name: 'L. Petrov',
    age: 34,
    region: 'LWS',
    diagnosis: 'Lumbago, unspez. Kreuzschmerz',
    phase: 'anamnese',
    phaseLabel: 'Anamnese',
    unit: 1,
    next: 'Di 11:15',
    flags: 2,
    status: 'aktiv'
  }, {
    id: 4,
    name: 'K. Hofer',
    age: 52,
    region: 'Knie li.',
    diagnosis: 'Gonarthrose Grad II',
    phase: 'befund',
    phaseLabel: 'Befund',
    unit: 7,
    next: 'Mi 16:00',
    flags: 0,
    status: 'aktiv'
  }, {
    id: 5,
    name: 'J. Wagner',
    age: 23,
    region: 'Sprunggelenk',
    diagnosis: 'Z. n. Außenband-Ruptur OSG',
    phase: 'gelenke',
    phaseLabel: 'Gelenke',
    unit: 5,
    next: '—',
    flags: 0,
    status: 'pause'
  }, {
    id: 6,
    name: 'R. Lindqvist',
    age: 37,
    region: 'Schulter re.',
    diagnosis: 'Rotatorenmanschetten-Läsion',
    phase: 'planung',
    phaseLabel: 'Planung',
    unit: 18,
    next: 'Do 10:30',
    flags: 0,
    status: 'abgeschlossen'
  }],
  phases: [{
    key: 'anamnese',
    label: 'Anamnese'
  }, {
    key: 'objektiv',
    label: 'Objektiv'
  }, {
    key: 'gelenke',
    label: 'Gelenke'
  }, {
    key: 'befund',
    label: 'Befund'
  }, {
    key: 'planung',
    label: 'Planung'
  }],
  // Phase 1 — Anamnese
  anamnese: {
    leitsymptom: 'Belastungsabhängige Instabilität Knie rechts',
    beginn: 'Akut, Sporttrauma',
    mechanismus: 'Distorsion beim Fußball (Pivot-Bewegung), 12 Wochen vor OP',
    verlauf: 'Z. n. arthroskopischer VKB-Plastik (Semitendinosus-Graft)',
    ziel: 'Rückkehr Mannschaftssport (Amateurliga) ohne Instabilitätsgefühl',
    schmerzRuhe: 1,
    schmerzBelastung: 4
  },
  tests: [{
    name: 'Lachman-Test',
    region: 'Knie · ventrale Stabilität',
    status: 'neg'
  }, {
    name: 'Pivot-Shift',
    region: 'Knie · Rotationsstabilität',
    status: 'neg'
  }, {
    name: 'Vordere Schublade',
    region: 'Knie · ventrale Stabilität',
    status: 'nd'
  }, {
    name: 'McMurray-Test',
    region: 'Meniskus medial',
    status: 'pos'
  }, {
    name: 'Steinmann I',
    region: 'Meniskus',
    status: 'nd'
  }],
  // Phase 3 — Gelenke (Bewegungsausmaß, Neutral-Null)
  gelenke: {
    joint: 'Kniegelenk',
    movements: [{
      name: 'Extension / Flexion',
      side: 're.',
      value: '0–5–130',
      ref: '0–0–140',
      limited: true
    }, {
      name: 'Extension / Flexion',
      side: 'li.',
      value: '0–0–140',
      ref: '0–0–140',
      limited: false
    }, {
      name: 'Innenrotation (90° Flex)',
      side: 're.',
      value: '0–25',
      ref: '0–30',
      limited: true
    }, {
      name: 'Außenrotation (90° Flex)',
      side: 're.',
      value: '0–38',
      ref: '0–40',
      limited: false
    }],
    endgefuehl: 'fest-elastisch',
    schwellung: 'gering (Umfang +1,5 cm Patella-Mitte)'
  },
  rts: [{
    name: 'LSI Quadrizeps',
    value: 92,
    cutoff: '≥ 90%',
    pass: true
  }, {
    name: 'LSI Hamstring',
    value: 78,
    cutoff: '≥ 90%',
    pass: false
  }, {
    name: 'Single Hop',
    value: 94,
    cutoff: '≥ 90%',
    pass: true
  }, {
    name: 'Triple Hop',
    value: 88,
    cutoff: '≥ 90%',
    pass: false
  }, {
    name: 'Y-Balance ant.',
    value: 95,
    cutoff: '≥ 94%',
    pass: true
  }],
  verlauf: [{
    unit: 13,
    date: '02.06.',
    nrs: 4,
    note: 'Belastung gesteigert, Schwellung abends'
  }, {
    unit: 12,
    date: '28.05.',
    nrs: 5,
    note: 'Erstmals einbeiniges Hüpfen'
  }, {
    unit: 11,
    date: '24.05.',
    nrs: 5,
    note: 'ROM endgradig schmerzhaft'
  }],
  // Berichte
  berichte: [{
    id: 1,
    title: 'Befundbericht — Erstbefund',
    date: '20.03.2026',
    type: 'Befund',
    status: 'final'
  }, {
    id: 2,
    title: 'Verlaufsbericht — Einheit 1–8',
    date: '02.05.2026',
    type: 'Verlauf',
    status: 'final'
  }, {
    id: 3,
    title: 'Return-to-Sport-Bericht',
    date: '06.06.2026',
    type: 'RTS',
    status: 'entwurf'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/physio-app/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.FlagChip = __ds_scope.FlagChip;

__ds_ns.NrsSlider = __ds_scope.NrsSlider;

__ds_ns.PhaseStepper = __ds_scope.PhaseStepper;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.TestStatusToggle = __ds_scope.TestStatusToggle;

__ds_ns.ValueReadout = __ds_scope.ValueReadout;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
