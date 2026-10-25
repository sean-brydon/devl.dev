import { Profile } from "@/registry/items/profile/profile";

export default function ProfileDemo() {
  return <Profile initiallyFollowing={false} mutuals={["Mira Castell", "Otto Brennan", "Priya Nair", "Jonah Ifeanyi"]} />;
}
