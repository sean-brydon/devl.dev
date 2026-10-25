import { AccessPass } from "@/registry/items/access-pass/access-pass";

export default function AccessPassDemo() {
  return (
    <AccessPass
      request={{
        number: "AP-2041",
        agent: { name: "Kestrel", code: "KST", role: "Coding agent" },
        resource: { name: "orbit/web", code: "GIT" },
        scope: "Push to feature branches",
        reason: "The search rate limiter is done and tested locally. I’d like to push it so CI runs before you review.",
        fields: [
          { label: "Access", value: "git push" },
          { label: "Branches", value: "feature/*" },
        ],
        risk: "medium",
      }}
    />
  );
}
