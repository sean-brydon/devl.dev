"use client";

import { PeoplePicker, type PickerOption } from "@/registry/items/people-picker/people-picker";

const people: PickerOption[] = [
  { id: "mara", label: "Mara Okafor", hint: "Design lead", group: "Design" },
  { id: "leo", label: "Leo Brandt", hint: "Product designer", group: "Design" },
  { id: "yuki", label: "Yuki Tanaka", hint: "Brand", group: "Design" },
  { id: "ines", label: "Ines Varga", hint: "Frontend", group: "Engineering" },
  { id: "sam", label: "Sam Adeyemi", hint: "Platform", group: "Engineering" },
  { id: "noor", label: "Noor Haddad", hint: "Mobile", group: "Engineering" },
  { id: "theo", label: "Theo Lindqvist", hint: "Infra", group: "Engineering" },
  { id: "growth", label: "Growth squad", hint: "6 members", group: "Teams" },
  { id: "billing", label: "Billing squad", hint: "4 members", group: "Teams" },
];

export default function PeoplePickerDemo() {
  return (
    <PeoplePicker
      defaultValue={[people[0], people[3]]}
      label="Reviewers"
      options={people}
      placeholder="Add reviewers…"
    />
  );
}
