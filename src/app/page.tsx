import { redirect } from "next/navigation";

// HR is the first module of the web app; other modules will get their own entry here.
export default function Home() {
  redirect("/hr");
}
