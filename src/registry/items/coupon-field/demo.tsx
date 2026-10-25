import { type CouponResult, CouponField } from "@/registry/items/coupon-field/coupon-field";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function validate(code: string): Promise<CouponResult> {
  await wait(900);
  switch (code) {
    case "SPRING15":
      return { ok: true, label: "15% off your order", percent: 15 };
    case "FREESHIP":
      return { ok: true, label: "Free shipping", freeShipping: true };
    case "SUMMER24":
      return { ok: false, reason: "SUMMER24 ended on 31 August." };
    case "WELCOME10":
      return { ok: false, reason: "WELCOME10 is for first orders only, and this account has one already." };
    default:
      return { ok: false, reason: `We couldn’t find ${code}. Check the spelling and try again.` };
  }
}

export default function CouponFieldDemo() {
  return (
    <div className="flex w-[360px] max-w-full flex-col gap-3">
      <CouponField
        lines={[
          { label: "Ember Candle × 2", amount: 68 },
          { label: "Tidewater Mug × 2", amount: 56 },
          { label: "Market Tote", amount: 22 },
        ]}
        shipping={6.5}
        validate={validate}
      />
      <p className="text-center text-muted-foreground text-xs">
        Try <span className="font-mono text-foreground">SPRING15</span>, <span className="font-mono text-foreground">FREESHIP</span> or{" "}
        <span className="font-mono text-foreground">SUMMER24</span>
      </p>
    </div>
  );
}
