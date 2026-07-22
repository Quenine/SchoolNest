import Link from "next/link";
import { createClassFeeStructure, createDefaultFeeCategories, createFeeCategory, createFeeItem, deactivateFeeItem, removeClassFeeStructure, updateFeeItem } from "@/app/dashboard/school-admin/finance/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Field, ReadOnlyField, SelectField, TextAreaField } from "@/components/dashboard/field";
import { DisclosurePanel, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmActionForm } from "@/components/forms/confirm-action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleImportActions } from "@/components/imports/module-import-actions";
import { formatMoney } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; code: string; description: string | null; sort_order: number; is_active: boolean };
type FeeItem = { id: string; category_id: string | null; name: string; code: string; billing_frequency: string; applies_to: string; is_mandatory: boolean; is_active: boolean; description: string | null };
type Structure = { id: string; academic_session_id: string; term_id: string | null; class_id: string; arm_id: string | null; fee_item_id: string; amount: number | string; is_required: boolean };
type OptionRow = { id: string; name: string };
type TermRow = { id: string; name: string; academic_session_id: string };
type ArmRow = { id: string; class_id: string; name: string };
type AddOnRow = { id: string; student_id: string; amount: number | string; status: string };
type Tab = "items" | "compulsory" | "optional" | "addons" | "totals";
type FeeSetupSearch = { tab?: string; session?: string; term?: string; class?: string; arm?: string };

type ClassFeeSummary = {
  key: string;
  className: string;
  armName: string | null;
  sessionName: string;
  termName: string | null;
  compulsory: Array<{ id: string; feeName: string; amount: number }>;
  optional: Array<{ id: string; feeName: string; amount: number }>;
  compulsoryTotal: number;
  optionalTotal: number;
};

const tabs: Array<{ id: Tab; label: string; description: string }> = [
  { id: "items", label: "Fee Items", description: "What your school charges for." },
  { id: "compulsory", label: "Class Compulsory Fees", description: "What every student in a class must pay." },
  { id: "optional", label: "Optional Fees", description: "Extra fees only selected students pay." },
  { id: "addons", label: "Student Add-ons", description: "Assign optional fees to students." },
  { id: "totals", label: "Class Totals", description: "Review class bills before invoicing." },
];
const frequencyOptions = ["termly", "session", "one_time", "monthly", "custom"];
const appliesToOptions = ["all_students", "section", "class", "arm", "individual"];
const validTabs = new Set(tabs.map((tab) => tab.id));

function tabHref(tab: Tab, params: FeeSetupSearch = {}) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  if (params.session) search.set("session", params.session);
  if (params.term) search.set("term", params.term);
  if (params.class) search.set("class", params.class);
  if (params.arm) search.set("arm", params.arm);
  return `/dashboard/school-admin/finance/fees?${search.toString()}`;
}

function statusFor(count: number, inProgressCount = 0) {
  if (count > 0 && inProgressCount === 0) return { label: "Complete", tone: "green" as const };
  if (count > 0 || inProgressCount > 0) return { label: "In progress", tone: "amber" as const };
  return { label: "Not started", tone: "gray" as const };
}

function buildSummaries(structures: Structure[], lookups: { feeItemById: Map<string, FeeItem>; sessionById: Map<string, OptionRow>; termById: Map<string, TermRow>; classById: Map<string, OptionRow>; armById: Map<string, ArmRow> }) {
  return Array.from(structures.reduce((map, structure) => {
    const key = [structure.academic_session_id, structure.term_id ?? "session", structure.class_id, structure.arm_id ?? "all"].join(":");
    const existing = map.get(key) ?? {
      key,
      className: lookups.classById.get(structure.class_id)?.name ?? "Class",
      armName: structure.arm_id ? lookups.armById.get(structure.arm_id)?.name ?? "Arm" : null,
      sessionName: lookups.sessionById.get(structure.academic_session_id)?.name ?? "Session",
      termName: structure.term_id ? lookups.termById.get(structure.term_id)?.name ?? null : null,
      compulsory: [],
      optional: [],
      compulsoryTotal: 0,
      optionalTotal: 0,
    } satisfies ClassFeeSummary;
    const amount = Number(structure.amount ?? 0);
    const line = { id: structure.id, feeName: lookups.feeItemById.get(structure.fee_item_id)?.name ?? "Fee item", amount };
    if (structure.is_required) {
      existing.compulsory.push(line);
      existing.compulsoryTotal += amount;
    } else {
      existing.optional.push(line);
      existing.optionalTotal += amount;
    }
    map.set(key, existing);
    return map;
  }, new Map<string, ClassFeeSummary>()).values());
}

function matchesSelection(structure: Structure, selection: { sessionId: string; termId: string; classId: string; armId: string }) {
  return structure.academic_session_id === selection.sessionId
    && structure.class_id === selection.classId
    && (selection.termId ? structure.term_id === selection.termId : structure.term_id === null)
    && (selection.armId ? structure.arm_id === selection.armId : structure.arm_id === null);
}

function SelectorBar({ activeTab, params, sessions, terms, classes, arms }: { activeTab: Tab; params: FeeSetupSearch; sessions: OptionRow[]; terms: TermRow[]; classes: OptionRow[]; arms: ArmRow[] }) {
  return (
    <form className="grid gap-3 rounded-lg border bg-muted/40 p-4 md:grid-cols-5" action="/dashboard/school-admin/finance/fees">
      <input type="hidden" name="tab" value={activeTab} />
      <SelectField label="Academic session" name="session" defaultValue={params.session}><option value="">Choose session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</SelectField>
      <SelectField label="Term" name="term" defaultValue={params.term}><option value="">Session fee</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</SelectField>
      <SelectField label="Class" name="class" defaultValue={params.class}><option value="">Choose class</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField>
      <SelectField label="Arm" name="arm" defaultValue={params.arm}><option value="">All arms</option>{arms.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField>
      <div className="flex items-end"><button className="h-12 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Apply</button></div>
    </form>
  );
}

function ClassFeeQuickForm({ kind, feeItems, selection }: { kind: "compulsory" | "optional"; feeItems: FeeItem[]; selection: { sessionId: string; termId: string; classId: string; armId: string } }) {
  return (
    <ActionForm action={createClassFeeStructure} submitLabel={kind === "compulsory" ? "Add compulsory fee" : "Add optional fee"} pendingLabel="Saving..." resetOnSuccess>
      <input type="hidden" name="academic_session_id" value={selection.sessionId} />
      <input type="hidden" name="term_id" value={selection.termId} />
      <input type="hidden" name="class_id" value={selection.classId} />
      <input type="hidden" name="arm_id" value={selection.armId} />
      <input type="hidden" name="is_required" value={kind === "compulsory" ? "true" : "false"} />
      <SelectField label="Fee item" name="fee_item_id" required><option value="">Choose fee item</option>{feeItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
      <Field label="Amount for this class" name="amount" type="number" defaultValue={0} helpText="This is the actual amount for the selected class, arm, session, and term." />
    </ActionForm>
  );
}

export default async function FeeSetupPage({ searchParams }: { searchParams?: Promise<FeeSetupSearch> }) {
  const params = (await searchParams) ?? {};
  const activeTab = validTabs.has(params.tab as Tab) ? params.tab as Tab : "items";
  const context = await getSchoolContext();
  const [{ data: categories }, { data: items }, { data: structures }, { data: sessions }, { data: terms }, { data: classes }, { data: arms }, { data: addOns }] = await Promise.all([
    context.supabase.from("fee_categories").select("*").eq("school_id", context.schoolId).order("sort_order"),
    context.supabase.from("fee_items").select("id, category_id, name, code, billing_frequency, applies_to, is_mandatory, is_active, description").eq("school_id", context.schoolId).order("created_at", { ascending: false }),
    context.supabase.from("class_fee_structures").select("*").eq("school_id", context.schoolId),
    context.supabase.from("academic_sessions").select("id, name").eq("school_id", context.schoolId).order("starts_on", { ascending: false }),
    context.supabase.from("terms").select("id, name, academic_session_id").eq("school_id", context.schoolId),
    context.supabase.from("classes").select("id, name").eq("school_id", context.schoolId).order("level_order"),
    context.supabase.from("class_arms").select("id, class_id, name").eq("school_id", context.schoolId),
    context.supabase.from("student_optional_fees").select("id, student_id, amount, status").eq("school_id", context.schoolId),
  ]);

  const categoryRows = (categories ?? []) as Category[];
  const itemRows = (items ?? []) as FeeItem[];
  const structureRows = (structures ?? []) as Structure[];
  const sessionRows = (sessions ?? []) as OptionRow[];
  const termRows = (terms ?? []) as TermRow[];
  const classRows = (classes ?? []) as OptionRow[];
  const armRows = (arms ?? []) as ArmRow[];
  const addOnRows = (addOns ?? []) as AddOnRow[];
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const feeItemById = new Map(itemRows.map((item) => [item.id, item]));
  const sessionById = new Map(sessionRows.map((session) => [session.id, session]));
  const termById = new Map(termRows.map((term) => [term.id, term]));
  const classById = new Map(classRows.map((row) => [row.id, row]));
  const armById = new Map(armRows.map((row) => [row.id, row]));
  const compulsoryRows = structureRows.filter((structure) => structure.is_required);
  const optionalRows = structureRows.filter((structure) => !structure.is_required);
  const activeAddOns = addOnRows.filter((row) => row.status === "active");
  const studentsWithAddOns = new Set(activeAddOns.map((row) => row.student_id)).size;
  const classesWithCompulsory = new Set(compulsoryRows.map((row) => [row.academic_session_id, row.term_id ?? "session", row.class_id, row.arm_id ?? "all"].join(":"))).size;
  const compulsoryItems = itemRows.filter((item) => item.is_active && item.is_mandatory);
  const optionalItems = itemRows.filter((item) => item.is_active && !item.is_mandatory);
  const summaries = buildSummaries(structureRows, { feeItemById, sessionById, termById, classById, armById });
  const selectedSession = params.session || sessionRows[0]?.id || "";
  const selectedClass = params.class || classRows[0]?.id || "";
  const selectedTerm = params.term || "";
  const selectedArm = params.arm || "";
  const selection = { sessionId: selectedSession, termId: selectedTerm, classId: selectedClass, armId: selectedArm };
  const selectedCompulsory = compulsoryRows.filter((row) => matchesSelection(row, selection));
  const selectedOptional = optionalRows.filter((row) => matchesSelection(row, selection));
  const selectedTitle = `${classById.get(selectedClass)?.name ?? "Choose class"}${selectedArm ? ` / ${armById.get(selectedArm)?.name ?? "Arm"}` : ""} / ${selectedTerm ? `${termById.get(selectedTerm)?.name ?? "Term"} Term` : "Session"} ${sessionById.get(selectedSession)?.name ?? ""}`;
  const activeParams = { ...params, session: selectedSession, term: selectedTerm, class: selectedClass, arm: selectedArm };
  const nextAction = getNextAction({ itemRows, compulsoryRows, optionalRows, activeAddOns });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Fee Setup"
        description="Set up what students pay in a clear order: fee items, class compulsory fees, optional fees, and student add-ons."
        action={<div className="flex flex-wrap gap-2"><Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={tabHref(nextAction.tab, activeParams)}>Continue setup</Link><Link className="rounded-md border px-4 py-2 text-sm font-semibold" href="/dashboard/school-admin/finance/invoices">View invoices</Link></div>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Fee Items Created" value={`${itemRows.length} items`} />
        <SummaryCard label="Classes With Compulsory Fees" value={`${classesWithCompulsory} groups`} />
        <SummaryCard label="Optional Fees Available" value={`${optionalRows.length} fees`} />
        <SummaryCard label="Students With Add-ons" value={`${studentsWithAddOns} students`} />
      </div>

      <Card><CardHeader><CardTitle>Setup Progress</CardTitle></CardHeader><CardContent className="grid gap-3 lg:grid-cols-4">
        <StepCard index={1} title="Fee Items" text="Create the list of things your school charges for, like Tuition, Exam Fee, Transport, Feeding, Boarding." count={`${itemRows.length} item${itemRows.length === 1 ? "" : "s"}`} status={statusFor(itemRows.length)} href={tabHref("items", activeParams)} />
        <StepCard index={2} title="Class Compulsory Fees" text="Set what every student in a class must pay." count={`${compulsoryRows.length} fees set`} status={statusFor(compulsoryRows.length, itemRows.length)} href={tabHref("compulsory", activeParams)} />
        <StepCard index={3} title="Optional Fees" text="Set fees that only selected students pay, like transport, feeding, or boarding." count={`${optionalRows.length} optional fees`} status={statusFor(optionalRows.length, compulsoryRows.length)} href={tabHref("optional", activeParams)} />
        <StepCard index={4} title="Student Add-ons" text="Assign optional fees to specific students." count={`${studentsWithAddOns} students assigned`} status={statusFor(studentsWithAddOns, optionalRows.length)} href={tabHref("addons", activeParams)} />
      </CardContent></Card>

      <Card className="border-primary/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6"><div><p className="text-sm font-semibold text-primary">Recommended next action</p><p className="mt-1 font-semibold">{nextAction.title}</p><p className="text-sm text-muted-foreground">{nextAction.description}</p></div><Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={tabHref(nextAction.tab, activeParams)}>{nextAction.button}</Link></CardContent></Card>

      <div className="flex gap-2 overflow-x-auto rounded-lg border bg-white p-2">
        {tabs.map((tab) => <Link key={tab.id} href={tabHref(tab.id, activeParams)} className={cn("min-w-fit rounded-md px-4 py-2 text-sm font-semibold", activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{tab.label}</Link>)}
      </div>

      {activeTab === "items" ? <FeeItemsPanel categoryRows={categoryRows} itemRows={itemRows} categoryById={categoryById} /> : null}
      {activeTab === "compulsory" ? <ClassFeesPanel kind="compulsory" title={selectedTitle} params={activeParams} sessions={sessionRows} terms={termRows} classes={classRows} arms={armRows} rows={selectedCompulsory} feeItemById={feeItemById} feeItems={compulsoryItems} /> : null}
      {activeTab === "optional" ? <ClassFeesPanel kind="optional" title={selectedTitle} params={activeParams} sessions={sessionRows} terms={termRows} classes={classRows} arms={armRows} rows={selectedOptional} feeItemById={feeItemById} feeItems={optionalItems} /> : null}
      {activeTab === "addons" ? <StudentAddOnsPanel studentsWithAddOns={studentsWithAddOns} activeAddOns={activeAddOns.length} activeTotal={activeAddOns.reduce((total, row) => total + Number(row.amount ?? 0), 0)} /> : null}
      {activeTab === "totals" ? <ClassTotalsPanel summaries={summaries} /> : null}

      <Card className="bg-muted/40"><CardContent className="pt-6 text-sm text-muted-foreground">Invoices are generated from compulsory class fees plus optional add-ons assigned to each student. Student totals may differ when transport, feeding, boarding, discounts, waivers, or corrections apply.</CardContent></Card>
    </div>
  );
}

function getNextAction({ itemRows, compulsoryRows, optionalRows, activeAddOns }: { itemRows: FeeItem[]; compulsoryRows: Structure[]; optionalRows: Structure[]; activeAddOns: AddOnRow[] }) {
  if (itemRows.length === 0) return { tab: "items" as Tab, title: "Start by creating default fee categories and fee items.", description: "Fee items are the names of charges. Amounts are set later per class.", button: "Start with fee items" };
  if (compulsoryRows.length === 0) return { tab: "compulsory" as Tab, title: "Next: set compulsory fees for each class.", description: "These are fees every student in the selected class must pay.", button: "Set class fees" };
  if (optionalRows.length === 0) return { tab: "optional" as Tab, title: "Next: add optional fees if your school uses them.", description: "Optional fees are available for the class but only apply to selected students.", button: "Add optional fees" };
  if (activeAddOns.length === 0) return { tab: "addons" as Tab, title: "Next: assign optional fees to selected students.", description: "Use this when a student uses transport, feeding, boarding, or another optional service.", button: "Manage add-ons" };
  return { tab: "totals" as Tab, title: "Finance setup is ready. You can generate invoices.", description: "Invoices now have class fees and student-specific add-ons ready for billing.", button: "Review totals" };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>;
}

function StepCard({ index, title, text, count, status, href }: { index: number; title: string; text: string; count: string; status: { label: string; tone: "green" | "amber" | "gray" }; href: string }) {
  return <div className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index}</span><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p><p className="mt-3 text-sm font-semibold">{count}</p><Link href={href} className="mt-3 inline-block text-sm font-semibold text-primary">Open</Link></div>;
}

function FeeItemsPanel({ categoryRows, itemRows, categoryById }: { categoryRows: Category[]; itemRows: FeeItem[]; categoryById: Map<string, Category> }) {
  return <Card><CardHeader><CardTitle>Fee Items</CardTitle><p className="text-sm text-muted-foreground">Fee items are the names of charges. Amounts are set later per class.</p></CardHeader><CardContent className="space-y-5"><ModuleImportActions compact title="Import fee items" description="Create fee definitions from CSV; amounts remain configured by class." module="fee-items" /><div className="flex flex-wrap gap-3"><ActionForm action={createDefaultFeeCategories} submitLabel="Create default categories" pendingLabel="Creating..." className="space-y-2"><p className="text-sm text-muted-foreground">Creates common Nigerian school fee categories without duplicates.</p></ActionForm><DisclosurePanel label="Add category" className="min-w-72"><ActionForm action={createFeeCategory} submitLabel="Add category" pendingLabel="Creating..." resetOnSuccess><Field label="Name" name="name" required /><Field label="Code" name="code" required helpText="Fixed after creation for clean reports." /><Field label="Sort order" name="sort_order" type="number" defaultValue={10} /><TextAreaField label="Description" name="description" /><input type="hidden" name="is_active" value="true" /></ActionForm></DisclosurePanel><DisclosurePanel label="Add fee item" className="min-w-80"><ActionForm action={createFeeItem} submitLabel="Add fee item" pendingLabel="Creating..." resetOnSuccess><SelectField label="Category" name="category_id"><option value="">No category</option>{categoryRows.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField><Field label="Name" name="name" required /><Field label="Code" name="code" required helpText="Fixed after creation for clean reports." /><TextAreaField label="Description" name="description" /><SelectField label="Billing frequency" name="billing_frequency" defaultValue="termly">{frequencyOptions.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</SelectField><SelectField label="Applies to" name="applies_to" defaultValue="class">{appliesToOptions.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</SelectField><SelectField label="Fee type" name="is_mandatory" defaultValue="true"><option value="true">Compulsory</option><option value="false">Optional</option></SelectField><input type="hidden" name="is_active" value="true" /></ActionForm></DisclosurePanel></div><p className="text-sm text-muted-foreground">Categories: {categoryRows.length}. Active fee items: {itemRows.filter((item) => item.is_active).length}.</p>{itemRows.length === 0 ? <EmptyState title="No fee items yet" message="Create Tuition, Exam Fee, PTA Levy, Transport, Feeding, Boarding, or other charges first." /> : <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4">Name</th><th>Category</th><th>Fee type</th><th>Frequency</th><th>Status</th><th>Action</th></tr></thead><tbody>{itemRows.map((item) => <tr className="border-t align-top" key={item.id}><td className="p-4 font-medium">{item.name}<p className="text-xs text-muted-foreground">{item.code}</p></td><td>{item.category_id ? categoryById.get(item.category_id)?.name ?? "No category" : "No category"}</td><td>{item.is_mandatory ? "Compulsory" : "Optional"}</td><td>{item.billing_frequency.replace("_", " ")}</td><td><StatusBadge tone={item.is_active ? "green" : "gray"}>{item.is_active ? "Active" : "Inactive"}</StatusBadge></td><td className="min-w-72 py-3"><DisclosurePanel label="Edit"><ActionForm action={updateFeeItem} submitLabel="Save fee item" pendingLabel="Updating..."><input type="hidden" name="id" value={item.id} /><SelectField label="Category" name="category_id" defaultValue={item.category_id}><option value="">No category</option>{categoryRows.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField><Field label="Name" name="name" defaultValue={item.name} required /><ReadOnlyField label="Code" name="code" value={item.code} /><TextAreaField label="Description" name="description" defaultValue={item.description} /><SelectField label="Billing frequency" name="billing_frequency" defaultValue={item.billing_frequency}>{frequencyOptions.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</SelectField><SelectField label="Applies to" name="applies_to" defaultValue={item.applies_to}>{appliesToOptions.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</SelectField><SelectField label="Fee type" name="is_mandatory" defaultValue={item.is_mandatory ? "true" : "false"}><option value="true">Compulsory</option><option value="false">Optional</option></SelectField><input type="hidden" name="is_active" value="false" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" value="true" defaultChecked={item.is_active} /> Active</label></ActionForm>{item.is_active ? <ConfirmActionForm action={deactivateFeeItem} triggerLabel="Deactivate" actionLabel="Deactivate fee item" description="This fee item will no longer be available in new fee setup." fields={{ id: item.id }} /> : null}</DisclosurePanel></td></tr>)}</tbody></table></div>}</CardContent></Card>;
}

function ClassFeesPanel({ kind, title, params, sessions, terms, classes, arms, rows, feeItemById, feeItems }: { kind: "compulsory" | "optional"; title: string; params: FeeSetupSearch; sessions: OptionRow[]; terms: TermRow[]; classes: OptionRow[]; arms: ArmRow[]; rows: Structure[]; feeItemById: Map<string, FeeItem>; feeItems: FeeItem[] }) {
  const total = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const selectionReady = Boolean(params.session && params.class);
  return <Card><CardHeader><CardTitle>{kind === "compulsory" ? "Class Compulsory Fees" : "Optional Fees"}</CardTitle><p className="text-sm text-muted-foreground">{kind === "compulsory" ? "These are fees every student in the selected class must pay." : "These fees are available for the class but only apply to selected students."}</p></CardHeader><CardContent className="space-y-5"><ModuleImportActions compact title="Import class fees" description="Set compulsory or optional class prices from CSV." module="class-fees" /><SelectorBar activeTab={kind === "compulsory" ? "compulsory" : "optional"} params={params} sessions={sessions} terms={terms} classes={classes} arms={arms} />{selectionReady ? <div className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{kind === "compulsory" ? "Class bill builder" : "Optional fee prices for selected class"}</p></div><p className="text-xl font-bold">{kind === "compulsory" ? "Base Class Total" : "Optional Fee Total"}: {formatMoney(total)}</p></div>{rows.length === 0 ? <EmptyState title={kind === "compulsory" ? "No compulsory fees for this selection" : "No optional fees for this selection"} message={kind === "compulsory" ? "Add Tuition, Exam Fee, PTA Levy or other compulsory fees first." : "Add transport, feeding, boarding, or other optional fee prices if your school uses them."} /> : <div className="mt-4 overflow-x-auto rounded-lg border"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-3">Fee Item</th><th>Amount</th><th>Required</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t" key={row.id}><td className="p-3 font-medium">{feeItemById.get(row.fee_item_id)?.name ?? "Fee item"}</td><td>{formatMoney(Number(row.amount))}</td><td>{kind === "compulsory" ? "Yes" : "No"}</td><td><ConfirmActionForm action={removeClassFeeStructure} triggerLabel="Remove" actionLabel="Remove fee" description="This removes the configured fee from the selected class." fields={{ id: row.id }} /></td></tr>)}</tbody></table></div>}<DisclosurePanel label={kind === "compulsory" ? "Add compulsory fee" : "Add optional fee"} className="mt-4"><>{feeItems.length === 0 ? <EmptyState title={kind === "compulsory" ? "No compulsory fee items yet" : "No optional fee items yet"} message={kind === "compulsory" ? "Create Tuition, Exam Fee, PTA Levy or other compulsory fee items first." : "Create Transport, Feeding, Boarding or other optional fee items first."} /> : <ClassFeeQuickForm kind={kind} feeItems={feeItems} selection={{ sessionId: params.session ?? "", termId: params.term ?? "", classId: params.class ?? "", armId: params.arm ?? "" }} />}</></DisclosurePanel>{kind === "optional" ? <p className="text-sm text-muted-foreground">These fees are not added to every invoice. They are only billed when assigned to a student from Student Add-ons.</p> : null}</div> : <EmptyState title="Choose a session and class" message="Use the filters to choose the class bill you want to set up." />}</CardContent></Card>;
}

function StudentAddOnsPanel({ studentsWithAddOns, activeAddOns, activeTotal }: { studentsWithAddOns: number; activeAddOns: number; activeTotal: number }) {
  return <Card><CardHeader><CardTitle>Student Add-ons</CardTitle><p className="text-sm text-muted-foreground">Assign optional fees like transport, feeding, or boarding to selected students before generating invoices.</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><SummaryCard label="Students with add-ons" value={String(studentsWithAddOns)} /><SummaryCard label="Active assignments" value={String(activeAddOns)} /><SummaryCard label="Total optional fees assigned" value={formatMoney(activeTotal)} /></div><Link className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/dashboard/school-admin/finance/student-addons">Manage student add-ons</Link></CardContent></Card>;
}

function ClassTotalsPanel({ summaries }: { summaries: ClassFeeSummary[] }) {
  return <Card><CardHeader><CardTitle>Class Totals</CardTitle><p className="text-sm text-muted-foreground">Review what each class pays. Student totals may be higher if optional fees are assigned.</p></CardHeader><CardContent>{summaries.length === 0 ? <EmptyState title="No class fees yet" message="Set compulsory and optional class fees to see totals here." /> : <div className="grid gap-4 xl:grid-cols-2">{summaries.map((summary) => <div key={summary.key} className="rounded-lg border p-4"><p className="font-semibold">{summary.className}{summary.armName ? ` / ${summary.armName}` : ""} / {summary.termName ? `${summary.termName} Term` : "Session"} {summary.sessionName}</p><div className="mt-4"><p className="text-sm font-semibold">Compulsory Fees</p>{summary.compulsory.length === 0 ? <p className="text-sm text-muted-foreground">No compulsory fees.</p> : <ul className="mt-2 divide-y text-sm">{summary.compulsory.map((line) => <li className="flex justify-between py-2" key={line.id}><span>{line.feeName}</span><span className="font-semibold">{formatMoney(line.amount)}</span></li>)}</ul>}<p className="mt-3 text-lg font-bold">Base Class Total: {formatMoney(summary.compulsoryTotal)}</p></div><div className="mt-5"><p className="text-sm font-semibold">Optional Fees Available</p>{summary.optional.length === 0 ? <p className="text-sm text-muted-foreground">No optional fees.</p> : <ul className="mt-2 divide-y text-sm">{summary.optional.map((line) => <li className="flex justify-between py-2" key={line.id}><span>{line.feeName}</span><span className="font-semibold">{formatMoney(line.amount)}</span></li>)}</ul>}<p className="mt-3 text-sm text-muted-foreground">Student totals may be higher if optional fees are assigned.</p></div></div>)}</div>}</CardContent></Card>;
}
