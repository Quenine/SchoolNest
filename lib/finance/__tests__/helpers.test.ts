import { describe, expect, it } from "vitest";
import { buildStudentInvoiceLines, calculateClassBaseTotal, calculateInvoiceStatus, calculateInvoiceTotals, calculateStudentOptionalTotal, formatMoney, generateInvoiceNumber, generatePaymentReference, generateReceiptNumber } from "../helpers";

describe("finance helpers", () => {
  it("calculates invoice totals with fixed discounts", () => {
    const totals = calculateInvoiceTotals([{ quantity: 1, unitAmount: 10000 }, { quantity: 2, unitAmount: 2500 }], [{ type: "discount", amount: 1000, amountType: "fixed" }], 3000);
    expect(totals.subtotalAmount).toBe(15000);
    expect(totals.discountAmount).toBe(1000);
    expect(totals.totalAmount).toBe(14000);
    expect(totals.paidAmount).toBe(3000);
    expect(totals.balanceAmount).toBe(11000);
  });

  it("calculates percentage scholarship discounts", () => {
    const totals = calculateInvoiceTotals([{ quantity: 1, unitAmount: 20000 }], [{ type: "scholarship", amount: 25, amountType: "percentage" }]);
    expect(totals.discountAmount).toBe(5000);
    expect(totals.totalAmount).toBe(15000);
  });

  it("uses only required class fees for base totals", () => {
    expect(calculateClassBaseTotal([{ amount: 60000, isRequired: true }, { amount: 25000, isRequired: false }])).toBe(60000);
  });

  it("includes optional fees only when assigned and active", () => {
    expect(calculateStudentOptionalTotal([{ amount: 25000, status: "active" }, { amount: 30000, status: "cancelled" }])).toBe(25000);
  });

  it("allows student invoice totals to vary with optional fees", () => {
    const first = calculateInvoiceTotals(buildStudentInvoiceLines([{ amount: 68000 }], [{ amount: 25000, status: "active" }]));
    const second = calculateInvoiceTotals(buildStudentInvoiceLines([{ amount: 68000 }], []));
    expect(first.totalAmount).toBe(93000);
    expect(second.totalAmount).toBe(68000);
  });

  it("calculates invoice status", () => {
    expect(calculateInvoiceStatus(1000, 1000)).toBe("paid");
    expect(calculateInvoiceStatus(1000, 200)).toBe("partially_paid");
    expect(calculateInvoiceStatus(1000, 0, "2020-01-01", new Date("2020-02-01"))).toBe("overdue");
    expect(calculateInvoiceStatus(1000, 0)).toBe("issued");
  });

  it("formats naira", () => {
    expect(formatMoney(1234)).toContain("1,234");
  });

  it("generates references with expected prefixes", () => {
    const date = new Date("2026-07-06T00:00:00Z");
    expect(generateInvoiceNumber("ABC", 0, date)).toMatch(/^INV-ABC-20260706-00001$/);
    expect(generatePaymentReference("ABC", 4, date)).toMatch(/^PAY-ABC-20260706-00005$/);
    expect(generateReceiptNumber("ABC", 9, date)).toMatch(/^RCT-ABC-20260706-00010$/);
  });
});
