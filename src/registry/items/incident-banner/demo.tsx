"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type IncidentUpdate, IncidentBanner } from "@/registry/items/incident-banner/incident-banner";

const script: IncidentUpdate[] = [
  {
    id: "u1",
    stage: "investigating",
    at: "14:02",
    message: "We're seeing elevated 5xx responses on write requests in eu-west and are looking into it.",
  },
  {
    id: "u2",
    stage: "identified",
    at: "14:19",
    message: "A connection pool change in this afternoon's deploy is exhausting database connections. Rolling it back now.",
  },
  {
    id: "u3",
    stage: "monitoring",
    at: "14:31",
    message: "The rollback is complete and error rates are back to baseline. We're watching closely.",
  },
  {
    id: "u4",
    stage: "resolved",
    at: "14:48",
    message: "Writes have been healthy for 15 minutes. A full write-up will follow within two business days.",
  },
];

export default function IncidentBannerDemo() {
  const [count, setCount] = useState(1);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const done = count >= script.length;
    const id = setTimeout(() => setCount(done ? 1 : count + 1), done ? 6000 : 4200);
    return () => clearTimeout(id);
  }, [count, visible]);

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {visible ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
            exit={{ opacity: 0, scale: 0.97 }}
            initial={{ opacity: 0, scale: 0.97 }}
            key="banner"
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <IncidentBanner
              affected={["API · writes", "Webhooks", "eu-west"]}
              defaultExpanded
              onDismiss={() => setVisible(false)}
              title="Elevated error rates on API writes"
              updates={script.slice(0, count)}
            />
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            key="restore"
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Button
              onClick={() => {
                setCount(1);
                setVisible(true);
              }}
              size="sm"
              variant="outline"
            >
              Show the banner again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
