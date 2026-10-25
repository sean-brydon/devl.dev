import { Envelope } from "@/registry/items/envelope/envelope";

export default function EnvelopeDemo() {
  return (
    <Envelope
      from="— Ines & the Northwind team"
      hue="rose"
      message="Join us for the Northwind launch on Friday at 6 pm, down at the old boathouse."
      monogram="N"
      title="You're invited"
    />
  );
}
