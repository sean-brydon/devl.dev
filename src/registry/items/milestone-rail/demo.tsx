import { MilestoneRail } from "@/registry/items/milestone-rail/milestone-rail";

export default function MilestoneRailDemo() {
  return (
    <MilestoneRail
      autoPlay
      steps={[
        { id: "account", title: "Create your account", description: "Email verified" },
        { id: "repo", title: "Connect a repository", description: "GitHub or GitLab" },
        { id: "env", title: "Add environment variables", description: "Import from a .env file" },
        { id: "deploy", title: "Ship your first deploy", description: "About 40 seconds" },
        { id: "domain", title: "Point your domain", description: "We'll handle TLS" },
      ]}
      title="Launch checklist"
    />
  );
}
