import {describe,expect,it} from "vitest";
import {manualPaymentSchema} from "./finance";
const base={student_id:'11111111-1111-4111-8111-111111111111',amount:'100',payment_method:'cash',payment_status:'confirmed'};
describe("manual payment conditional validation",()=>{it("requires an unallocated reason",()=>expect(manualPaymentSchema.safeParse(base).success).toBe(false));it("accepts an invoice without a reason",()=>expect(manualPaymentSchema.safeParse({...base,invoice_id:'22222222-2222-4222-8222-222222222222'}).success).toBe(true));it("rejects future paid timestamps",()=>expect(manualPaymentSchema.safeParse({...base,transaction_note:'Advance',paid_at:'2999-01-01T10:00'}).success).toBe(false));});
