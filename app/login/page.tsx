import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextValue = params.next;
  const nextUrl = Array.isArray(nextValue)
    ? nextValue[0] || "/dashboard"
    : nextValue || "/dashboard";

  return <LoginForm nextUrl={nextUrl} />;
}