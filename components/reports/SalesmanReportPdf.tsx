import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { SalesmanMonthlyReport } from "@/lib/salesman-report";
import { enquiryRef, enquiryStatusLabels, type EnquiryStatus } from "@/types/enquiry";
import { clientStatusLabel } from "@/types/client";

/* Server-only: rendered to a PDF buffer by app/api/reports/salesman/[id]/route.ts. */

const fontDir = path.join(process.cwd(), "node_modules/@fontsource/inter/files");
Font.register({
  family: "Inter",
  fonts: [400, 500, 600, 700, 800].map((fontWeight) => ({ src: path.join(fontDir, `inter-latin-${fontWeight}-normal.woff`), fontWeight })),
});
Font.registerHyphenationCallback((word) => [word]);

const C = {
  ink: "#0F172A",
  body: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  line: "#E2E8F0",
  subtle: "#F8FAFC",
  primary: "#059669",
  primaryDark: "#064E3B",
  primarySoft: "#ECFDF5",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  warning: "#D97706",
  info: "#2563EB",
};

const STATUS_COLOR: Record<EnquiryStatus, string> = {
  inquiry_received: "#94A3B8",
  quoted: "#3B82F6",
  negotiation: "#F59E0B",
  offer_revised: "#8B5CF6",
  confirmed: "#059669",
  lost: "#EF4444",
};

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9, color: C.body, paddingTop: 32, paddingBottom: 48, paddingHorizontal: 36, backgroundColor: "#FFFFFF" },
  hero: { backgroundColor: C.primaryDark, borderRadius: 14, padding: 22, flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "#6EE7B7" },
  heroTitle: { fontSize: 22, fontWeight: 800, color: "#FFFFFF", marginTop: 6 },
  heroSub: { fontSize: 10, color: "#D1FAE5", marginTop: 3 },
  heroRight: { alignItems: "flex-end", justifyContent: "flex-end", maxWidth: 220 },
  heroName: { fontSize: 13, fontWeight: 700, color: "#FFFFFF", textAlign: "right" },
  heroMeta: { fontSize: 8, color: "#A7F3D0", marginTop: 2, textAlign: "right" },

  row: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, backgroundColor: "#FFFFFF" },
  kpiLabel: { fontSize: 7, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  kpiValue: { fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 4 },
  kpiFoot: { fontSize: 7, color: C.muted, marginTop: 3 },

  section: { marginTop: 18 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  sectionBar: { width: 3, height: 12, borderRadius: 2, backgroundColor: C.primary },
  sectionTitle: { fontSize: 11.5, fontWeight: 700, color: C.ink },
  sectionNote: { fontSize: 7.5, color: C.muted, marginLeft: "auto" },

  card: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12 },
  insight: { backgroundColor: C.primarySoft, borderRadius: 10, padding: 12, marginTop: 12 },
  insightText: { fontSize: 9, lineHeight: 1.55, color: "#065F46" },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: "hidden" },
  th: { flexDirection: "row", backgroundColor: C.subtle, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6, paddingHorizontal: 10 },
  thText: { fontSize: 7, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  tr: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  td: { fontSize: 8.5, color: C.body },
  tdStrong: { fontSize: 8.5, fontWeight: 600, color: C.ink },
  num: { textAlign: "right" },

  track: { height: 6, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden" },
  empty: { fontSize: 8.5, color: C.muted, paddingVertical: 10, textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.faint, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
});

/* ───────────── formatting ───────────── */

const money = (v: number) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const compact = (v: number) =>
  Math.abs(v) >= 100_000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v) : money(v);
const int = (v: number) => new Intl.NumberFormat("en").format(v);
const pct = (v: number | null, digits = 0) => (v === null ? "—" : `${v.toFixed(digits)}%`);
const date = (d: Date) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const title = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? { text: "No change", color: C.muted } : { text: "New this month", color: C.primary };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { text: "No change", color: C.muted };
  return { text: `${change > 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(0)}%`, color: change > 0 ? C.primary : C.danger };
}

/* ───────────── building blocks ───────────── */

function Section({ title: heading, note, children, breakBefore }: { title: string; note?: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <View style={s.section} break={breakBefore}>
      <View style={s.sectionHead} minPresenceAhead={60}>
        <View style={s.sectionBar} />
        <Text style={s.sectionTitle}>{heading}</Text>
        {note ? <Text style={s.sectionNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Kpi({ label, value, foot, accent, children }: { label: string; value: string; foot?: string; accent?: string; children?: React.ReactNode }) {
  return (
    <View style={[s.kpi, accent ? { borderTopWidth: 3, borderTopColor: accent } : {}]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {foot ? <Text style={s.kpiFoot}>{foot}</Text> : null}
      {children}
    </View>
  );
}

function Trend({ current, previous, label, invert }: { current: number; previous: number; label: string; invert?: boolean }) {
  const d = delta(current, previous);
  const color = invert && d.color !== C.muted ? (d.color === C.primary ? C.danger : C.primary) : d.color;
  return (
    <Text style={s.kpiFoot}>
      <Text style={{ color, fontWeight: 700 }}>{d.text}</Text> vs {label}
    </Text>
  );
}

function Bar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <View style={[s.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${width}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

type Col<T> = { label: string; width: number | string; align?: "right"; render: (row: T) => React.ReactNode; strong?: boolean };

function Table<T>({ cols, rows, empty }: { cols: Col<T>[]; rows: T[]; empty: string }) {
  return (
    <View style={s.table}>
      <View style={s.th} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.thText, { width: c.width }, c.align === "right" ? s.num : {}]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={s.empty}>{empty}</Text>
      ) : (
        rows.map((row, i) => (
          <View key={i} style={[s.tr, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
            {cols.map((c) => (
              <View key={c.label} style={{ width: c.width, paddingRight: c.align === "right" ? 0 : 6 }}>
                <Text style={[c.strong ? s.tdStrong : s.td, c.align === "right" ? s.num : {}]}>{c.render(row)}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

/* ───────────── narrative ───────────── */

function summary(r: SalesmanMonthlyReport) {
  if (!r) return "";
  const first = r.salesman.name.split(" ")[0];
  const e = r.enquiries;
  const parts: string[] = [];
  if (e.total === 0) parts.push(`${first} raised no enquiries in ${r.monthLabel}.`);
  else {
    const d = delta(e.total, r.enquiriesPrev.total).text;
    parts.push(
      `${first} raised ${int(e.total)} enquir${e.total === 1 ? "y" : "ies"} in ${r.monthLabel}` +
        (r.enquiriesPrev.total ? ` (${d === "No change" ? "level with" : `${d} vs`} ${r.prevMonthLabel})` : "") +
        `, of which ${int(e.counts.confirmed)} ${e.counts.confirmed === 1 ? "is" : "are"} confirmed — a ${pct(e.conversion)} conversion rate.`,
    );
    if (e.open > 0) parts.push(`${int(e.open)} ${e.open === 1 ? "is" : "are"} still in progress.`);
  }
  if (r.onboarded.count > 0) parts.push(`${int(r.onboarded.count)} new client${r.onboarded.count === 1 ? " was" : "s were"} onboarded with a first order.`);
  if (r.lost.count > 0) {
    const top = r.lost.reasons[0];
    parts.push(`${int(r.lost.count)} enquir${r.lost.count === 1 ? "y was" : "ies were"} lost${top ? `; the most common reason was “${top.reason.replace(/\.$/, "")}” (${top.count})` : ""}.`);
  }
  if (r.target) {
    const p = r.target.amount > 0 ? (r.target.achieved / r.target.amount) * 100 : 0;
    parts.push(`Target progress stands at ${pct(p)} of ${money(r.target.amount)}.`);
  }
  return parts.join(" ");
}

/* ───────────── document ───────────── */

export function SalesmanReportPdf({ report: r }: { report: NonNullable<SalesmanMonthlyReport> }) {
  const e = r.enquiries;
  const statusMax = Math.max(...Object.values(e.counts), 1);
  const modeMax = Math.max(...r.modes.map((m) => m.count), 1);
  const reasonMax = Math.max(...r.lost.reasons.map((x) => x.count), 1);
  const targetPct = r.target && r.target.amount > 0 ? (r.target.achieved / r.target.amount) * 100 : 0;
  const portfolioTotal = Object.values(r.portfolio).reduce((a, b) => a + b, 0);

  return (
    <Document title={`${r.salesman.name} — ${r.monthLabel} performance`} author="SalesPal" subject="Monthly salesman performance report">
      <Page size="A4" style={s.page}>
        {/* Hero */}
        <View style={s.hero}>
          <View>
            <Text style={s.eyebrow}>SalesPal · Performance report</Text>
            <Text style={s.heroTitle}>{r.monthLabel}</Text>
            <Text style={s.heroSub}>Monthly salesman performance</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroName}>{r.salesman.name}</Text>
            <Text style={s.heroMeta}>{r.salesman.email}</Text>
            {r.salesman.phone ? <Text style={s.heroMeta}>{r.salesman.phone}</Text> : null}
            {r.salesman.managers.length ? <Text style={s.heroMeta}>Manager: {r.salesman.managers.join(", ")}</Text> : null}
          </View>
        </View>

        {/* Headline KPIs */}
        <View style={s.row}>
          <Kpi label="Clients onboarded" value={int(r.onboarded.count)} accent={C.primary}>
            <Trend current={r.onboarded.count} previous={r.onboarded.prev} label={r.prevMonthLabel} />
          </Kpi>
          <Kpi label="Enquiries raised" value={int(e.total)} accent={C.info}>
            <Trend current={e.total} previous={r.enquiriesPrev.total} label={r.prevMonthLabel} />
          </Kpi>
          <Kpi label="Conversion rate" value={pct(e.conversion)} accent="#8B5CF6" foot={`Win rate ${pct(e.winRate)} of decided`} />
          <Kpi label="Enquiries lost" value={int(r.lost.count)} accent={C.danger}>
            <Trend current={r.lost.count} previous={r.lost.prev} label={r.prevMonthLabel} invert />
          </Kpi>
        </View>
        <View style={[s.row, { marginTop: 8 }]}>
          <Kpi label="Order value" value={compact(r.orders.value)} foot={`${int(r.orders.count)} order${r.orders.count === 1 ? "" : "s"} confirmed`} />
          <Kpi label="Payments collected" value={compact(r.collected.amount)} foot={`${int(r.collected.count)} payment${r.collected.count === 1 ? "" : "s"} recorded`} />
          <Kpi label="Quoted value" value={compact(e.quotedValue)} foot={`Avg. margin ${pct(e.margin, 1)}`} />
          <Kpi label="KPI score" value={int(r.kpiScore)} foot={`${int(portfolioTotal)} clients in portfolio`} />
        </View>

        {/* Target */}
        {r.target ? (
          <View style={[s.card, { marginTop: 12 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: 700, color: C.ink }}>Sales target</Text>
              <Text style={{ fontSize: 8, color: C.muted }}>
                {date(r.target.periodStart)} – {date(r.target.periodEnd)}
              </Text>
            </View>
            <Bar value={Math.min(targetPct, 100)} max={100} color={targetPct >= 100 ? C.primary : C.info} height={8} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
              <Text style={{ fontSize: 8, color: C.body }}>
                <Text style={{ fontWeight: 700, color: C.ink }}>{money(r.target.achieved)}</Text> achieved of {money(r.target.amount)}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: 700, color: targetPct >= 100 ? C.primary : C.info }}>{pct(targetPct)}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.insight}>
          <Text style={[s.eyebrow, { color: C.primary, marginBottom: 4 }]}>Month at a glance</Text>
          <Text style={s.insightText}>{summary(r)}</Text>
        </View>

        {/* Enquiry summary */}
        <Section title="Enquiry summary" note={`${int(e.total)} raised · ${int(e.quotedCount)} quoted`}>
          <View style={s.row}>
            <View style={[s.card, { flex: 1.25 }]}>
              <Text style={[s.kpiLabel, { marginBottom: 8 }]}>Raised this month · current stage</Text>
              {(Object.keys(e.counts) as EnquiryStatus[]).map((status) => (
                <View key={status} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLOR[status], marginRight: 6 }} />
                  <Text style={{ width: 82, fontSize: 8.5 }}>{enquiryStatusLabels[status]}</Text>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Bar value={e.counts[status]} max={statusMax} color={STATUS_COLOR[status]} />
                  </View>
                  <Text style={{ width: 26, fontSize: 8.5, fontWeight: 700, color: C.ink, textAlign: "right" }}>{int(e.counts[status])}</Text>
                </View>
              ))}
            </View>
            <View style={[s.card, { flex: 1 }]}>
              <Text style={[s.kpiLabel, { marginBottom: 8 }]}>By mode</Text>
              {r.modes.length === 0 ? <Text style={s.empty}>No enquiries</Text> : null}
              {r.modes.map((m) => (
                <View key={m.mode} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                    <Text style={{ fontSize: 8.5, color: C.ink, fontWeight: 600 }}>{title(m.mode)}</Text>
                    <Text style={{ fontSize: 8, color: C.muted }}>
                      {int(m.count)} · {int(m.confirmed)} confirmed
                    </Text>
                  </View>
                  <Bar value={m.count} max={modeMax} color={C.primary} />
                </View>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 4, paddingTop: 6 }}>
                <Text style={{ fontSize: 8, color: C.muted }}>
                  Quoted profit <Text style={{ color: C.ink, fontWeight: 700 }}>{money(e.quotedProfit)}</Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Table
              empty="No enquiries this month"
              rows={r.routes}
              cols={[
                { label: "Top routes", width: "58%", strong: true, render: (x) => `${x.from} › ${x.to}` },
                { label: "Enquiries", width: "14%", align: "right", render: (x) => int(x.count) },
                { label: "Confirmed", width: "14%", align: "right", render: (x) => int(x.confirmed) },
                { label: "Hit rate", width: "14%", align: "right", render: (x) => pct(x.count ? (x.confirmed / x.count) * 100 : null) },
              ]}
            />
          </View>
        </Section>

        {/* Clients onboarded */}
        <Section
          title="Clients onboarded this month"
          note={`${int(r.onboarded.count)} onboarded · ${int(r.onboarded.newClients)} new client${r.onboarded.newClients === 1 ? "" : "s"} added`}
        >
          <Table
            empty="No clients placed their first order this month"
            rows={r.onboarded.clients}
            cols={[
              { label: "Client", width: "34%", strong: true, render: (x) => x.name },
              { label: "Company", width: "24%", render: (x) => x.company },
              { label: "First order", width: "16%", render: (x) => date(x.firstOrder) },
              { label: "Orders", width: "10%", align: "right", render: (x) => int(x.orders) },
              { label: "Value", width: "16%", align: "right", render: (x) => money(x.value) },
            ]}
          />
        </Section>

        {/* Lost */}
        <Section title="Lost enquiries" note={`${int(r.lost.count)} lost · ${money(r.lost.value)} quoted value`}>
          {r.lost.count === 0 ? (
            <View style={[s.card, { backgroundColor: C.primarySoft, borderColor: C.primarySoft }]}>
              <Text style={{ fontSize: 9, color: "#065F46", textAlign: "center" }}>No enquiries were lost this month.</Text>
            </View>
          ) : (
            <>
              <View style={[s.card, { marginBottom: 10 }]} wrap={false}>
                <Text style={[s.kpiLabel, { marginBottom: 8 }]}>Reasons for loss</Text>
                {r.lost.reasons.map((x) => (
                  <View key={x.reason} style={{ marginBottom: 7 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5, color: C.ink, maxWidth: "70%" }}>{x.reason}</Text>
                      <Text style={{ fontSize: 8, color: C.muted }}>
                        <Text style={{ fontWeight: 700, color: C.ink }}>{int(x.count)}</Text> · {pct((x.count / r.lost.count) * 100)} · {money(x.value)}
                      </Text>
                    </View>
                    <Bar value={x.count} max={reasonMax} color="#F87171" />
                  </View>
                ))}
              </View>
              <Table
                empty=""
                rows={r.lost.items}
                cols={[
                  { label: "Enquiry", width: "13%", strong: true, render: (x) => enquiryRef(x.id) },
                  { label: "Client", width: "21%", render: (x) => x.client },
                  { label: "Route", width: "20%", render: (x) => `${x.from} › ${x.to}` },
                  { label: "Reason", width: "22%", render: (x) => x.reason ?? "—" },
                  { label: "Lost on", width: "12%", render: (x) => date(x.lostAt) },
                  { label: "Value", width: "12%", align: "right", render: (x) => (x.value === null ? "—" : money(x.value)) },
                ]}
              />
            </>
          )}
        </Section>

        {/* Orders & activity */}
        <Section title="Orders, collections & activity">
          <View style={s.row} wrap={false}>
            <View style={[s.card, { flex: 1 }]}>
              <Text style={[s.kpiLabel, { marginBottom: 8 }]}>Orders this month</Text>
              {[
                ["Confirmed orders", int(r.orders.count)],
                ["Order value", money(r.orders.value)],
                ["In transit", int(r.orders.transit)],
                ["Delivered", int(r.orders.delivered)],
                ["Completed", int(r.orders.completed)],
                ["Cancelled / sent for revision", int(r.orders.voided)],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                  <Text style={{ fontSize: 8.5 }}>{k}</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.ink }}>{v}</Text>
                </View>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 4, paddingTop: 6 }}>
                <Trend current={r.orders.value} previous={r.ordersPrev.value} label={`${r.prevMonthLabel} order value`} />
              </View>
            </View>
            <View style={[s.card, { flex: 1 }]}>
              <Text style={[s.kpiLabel, { marginBottom: 8 }]}>Activity</Text>
              {[
                ["Tasks due this month", int(r.activity.tasks.total)],
                ["Tasks achieved", int(r.activity.tasks.achieved)],
                ["Tasks unsuccessful", int(r.activity.tasks.unsuccessful)],
                ["Tasks still open", int(r.activity.tasks.open)],
                ["Enquiry follow-ups logged", int(r.activity.followUps)],
                ["Client status updates", int(r.activity.statusChanges)],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                  <Text style={{ fontSize: 8.5 }}>{k}</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.ink }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[s.card, { marginTop: 10 }]} wrap={false}>
            <Text style={[s.kpiLabel, { marginBottom: 8 }]}>Client portfolio today</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(r.portfolio)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <View key={status} style={{ flexDirection: "row", borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: C.subtle }}>
                    <Text style={{ fontSize: 8, color: C.body }}>{clientStatusLabel(status)} </Text>
                    <Text style={{ fontSize: 8, fontWeight: 700, color: C.ink }}>{int(count)}</Text>
                  </View>
                ))}
            </View>
          </View>
        </Section>

        <Text style={{ fontSize: 7, color: C.faint, marginTop: 14, lineHeight: 1.5 }}>
          Onboarded = clients whose first order was created this month. Enquiries are those dated this month, shown at their current stage. Conversion = confirmed ÷
          raised; win rate = confirmed ÷ (confirmed + lost). Order value excludes cancelled orders and orders sent back for revision. Amounts are as recorded in SalesPal.
        </Text>

        <View style={s.footer} fixed>
          <Text>
            {r.salesman.name} · {r.monthLabel} · Generated {date(r.generatedAt)}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
