import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/finance/helpers";

export interface ReceiptCardProps {
  schoolName: string;
  receiptNumber: string;
  studentName: string;
  admissionNumber?: string | null;
  className?: string | null;
  armName?: string | null;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  invoiceNumber?: string | null;
  balanceAfterPayment?: number | null;
  receivedBy?: string | null;
  notes?: string | null;
  preview?: boolean;
}

export function ReceiptCard({ schoolName, receiptNumber, studentName, admissionNumber, className, armName, paymentDate, paymentMethod, amount, invoiceNumber, balanceAfterPayment, receivedBy, notes, preview }: ReceiptCardProps) {
  return (
    <Card className="overflow-hidden border-2 border-primary/20 bg-white">
      <div className="flex items-start justify-between border-b p-6">
        <div>
          <div className="grid size-12 place-items-center rounded-xl bg-secondary text-sm font-bold text-primary">LOGO</div>
          <h2 className="mt-4 text-xl font-bold">{schoolName}</h2>
          <p className="text-sm text-muted-foreground">This receipt is system-generated</p>
        </div>
        <div className="text-right">
          {preview ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Preview / Watermarked</span> : null}
          <p className="mt-3 text-sm text-muted-foreground">Receipt number</p>
          <p className="font-semibold">{receiptNumber}</p>
        </div>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <Info label="Student" value={studentName} />
        <Info label="Admission number" value={admissionNumber ?? "-"} />
        <Info label="Class/arm" value={[className, armName].filter(Boolean).join(" ") || "-"} />
        <Info label="Payment date" value={new Date(paymentDate).toLocaleString("en-NG")} />
        <Info label="Payment method" value={paymentMethod.replace("_", " ")} />
        <Info label="Invoice" value={invoiceNumber ?? "Unallocated"} />
        <Info label="Amount paid" value={formatMoney(amount)} strong />
        <Info label="Balance after payment" value={balanceAfterPayment === null || balanceAfterPayment === undefined ? "-" : formatMoney(balanceAfterPayment)} />
        <Info label="Received by" value={receivedBy ?? "School finance office"} />
        <Info label="Notes" value={notes ?? "-"} />
      </div>
    </Card>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className={strong ? "mt-1 text-lg font-bold" : "mt-1 font-medium"}>{value}</p></div>;
}

