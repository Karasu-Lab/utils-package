import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { log } from "./log";
import { vercelProtectionBypassHeaders } from "./vercel-bypass";

/** The subset of better-auth's `user` model that callers across apps rely on. */
export interface SessionUser {
    uid: string;
    email: string | null;
    name: string | null;
    image: string | null;
}

interface GetSessionResponse {
    user?: {
        id: string;
        email?: string | null;
        name?: string | null;
        image?: string | null;
    } | null;
}

/** Verifies the current session against api-auth.karasu256.com, since calling apps hold no auth credentials of their own. */
export async function getSessionUser(
    authApiUrl: string | undefined,
    protectionBypassSecret?: string,
): Promise<SessionUser | null> {
    if (!authApiUrl) {
        return null;
    }

    const requestHeaders = await headers();
    if (!getSessionCookie(requestHeaders)) {
        return null;
    }

    const url = `${authApiUrl}/api/auth/get-session`;
    try {
        const res = await fetch(url, {
            headers: {
                cookie: requestHeaders.get("cookie") ?? "",
                ...vercelProtectionBypassHeaders(protectionBypassSecret),
            },
            cache: "no-store",
        });
        if (!res.ok) {
            log(
                "get_session_user",
                {
                    result: "failure",
                    url,
                    status: res.status,
                },
                "error",
            );
            return null;
        }

        const data = (await res.json()) as GetSessionResponse;
        if (!data.user) {
            log("get_session_user", { result: "no_session" }, "error");
            return null;
        }

        return {
            uid: data.user.id,
            email: data.user.email ?? null,
            name: data.user.name ?? null,
            image: data.user.image ?? null,
        };
    } catch (err) {
        log(
            "get_session_user",
            {
                result: "error",
                url,
                error: err instanceof Error ? err.message : String(err),
            },
            "error",
        );
        return null;
    }
}
