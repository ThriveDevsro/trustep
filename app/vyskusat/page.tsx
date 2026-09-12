import { redirect } from "next/navigation";

export default function PublicTrialPage() {
  redirect("/register?next=%2Fsubmit");
}
