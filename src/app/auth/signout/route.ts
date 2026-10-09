import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /auth/signout : oturumu kapatır. POST olması, bir bağlantıyla yanlışlıkla çıkış yapılmasını önler.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/giris", request.nextUrl.origin), { status: 303 });
}
