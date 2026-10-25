import { GiftBox } from "@/registry/items/gift-box/gift-box";

export default function GiftBoxDemo() {
  return (
    <GiftBox
      amount="$20"
      code="MIRA-20"
      description="Mira joined with your invite link. Open it up to see what you earned."
      hue="rose"
      label="Referral credit"
      openDescription="It comes off your next invoice. Share the code to give a friend the same."
      openTitle="$20 credit unlocked"
      title="You've got a reward"
    />
  );
}
