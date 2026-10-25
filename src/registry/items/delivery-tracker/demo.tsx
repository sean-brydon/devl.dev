import { DeliveryTracker } from "@/registry/items/delivery-tracker/delivery-tracker";

export default function DeliveryTrackerDemo() {
  return (
    <DeliveryTracker
      address="Flat 3, 18 Alder Row"
      courier={{ name: "Tomás Reyes", rating: 4.9, trips: 1284, vehicle: "Green e-bike", phone: "+15555550142" }}
      orderId="LC-20931"
      routeMinutes={18}
      simulateSeconds={40}
      startAt={0.3}
      storeName="Larder & Co."
    />
  );
}
