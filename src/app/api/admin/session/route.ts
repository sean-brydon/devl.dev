import { Effect } from "effect";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminSessionFor, limitAdminLogin, respond } from "@/server/runtime";
import { AdminLoginRequest, decodeBody } from "@/server/schemas";

const decode = decodeBody(AdminLoginRequest);

export async function POST(request: Request) {
  const jar = await cookies();
  return respond(
    Effect.gen(function* () {
      yield* limitAdminLogin(request);
      const { token } = yield* decode(request);
      const session = yield* adminSessionFor(token);
      jar.set(ADMIN_COOKIE, session, {
        httpOnly: true,
        sameSite: "strict",
        secure: new URL(request.url).protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return Response.json({ ok: true });
    }),
  );
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
