import { redirect } from "next/navigation";

/** No Supabase — replaces former middleware `/` → `/following` redirect. */
export default function Home() {
  redirect("/following");
}
