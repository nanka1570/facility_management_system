import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/types/database";

// セッション更新 + 認証/権限ガード（proxy.ts から呼ばれる）
//
// リダイレクト規則:
//   未認証 ∧ `/` 以外                     → `/`
//   認証済 ∧ `/`                          → `/dashboard`（roleを問わない）
//   `/admin/*` ∧ role が admin/developer 以外 → `/dashboard`
//   `/admin/settings` ∧ role が developer 以外 → `/admin/dashboard`
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // 認証Cookie付きレスポンスがCDN等にキャッシュされるのを防ぐヘッダー
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // createServerClient と getUser() の間に処理を挟まないこと
  // （セッション更新が正しく行われず、ランダムなログアウトの原因になる）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // セッション更新Cookieを引き継いだままリダイレクトする
  // （引き継がないとブラウザとサーバーのセッションがずれてログアウトが多発する）
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (!user) {
    if (pathname !== "/") {
      return redirectTo("/");
    }
    return supabaseResponse;
  }

  if (pathname === "/") {
    return redirectTo("/dashboard");
  }

  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role: UserRole | undefined = profile?.role;

    if (role !== "admin" && role !== "developer") {
      return redirectTo("/dashboard");
    }
    if (pathname.startsWith("/admin/settings") && role !== "developer") {
      return redirectTo("/admin/dashboard");
    }
  }

  return supabaseResponse;
}
