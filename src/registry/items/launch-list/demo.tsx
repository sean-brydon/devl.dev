import { LaunchList } from "@/registry/items/launch-list/launch-list";

export default function LaunchListDemo() {
  return (
    <LaunchList
      groups={[
        {
          id: "workspace",
          title: "Your workspace",
          tasks: [
            { id: "name", label: "Name your workspace", done: true },
            { id: "logo", label: "Upload a logo", hint: "Shows on invoices and emails", done: true },
            { id: "domain", label: "Connect a custom domain", hint: "e.g. help.tidewater.io" },
          ],
        },
        {
          id: "team",
          title: "Bring your team",
          tasks: [
            { id: "invite", label: "Invite two teammates" },
            { id: "roles", label: "Pick who can publish" },
          ],
        },
        {
          id: "launch",
          title: "Go live",
          tasks: [
            { id: "first", label: "Publish your first article" },
            { id: "widget", label: "Add the help widget to your site", hint: "One line of script" },
          ],
        },
      ]}
      title="Set up Tidewater"
    />
  );
}
