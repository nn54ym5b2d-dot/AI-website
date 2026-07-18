import { redirect } from "next/navigation";
import { authEntryHref } from "@/lib/auth/redirect";

type RegisterPageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { next } = await searchParams;
  redirect(next ? authEntryHref(next) : "/login");
}
