import {
    isPermitted,
    type RouteAuthContext,
    type TokenValidator,
} from "@karasu-lab/api-permissions";

export {
    toOauthScope,
    type RouteAuthContext,
    type RouteAuthMethod,
    type TokenValidator,
} from "@karasu-lab/api-permissions";

export interface RouteAuthDeps {
    validator: TokenValidator;
}

type RouteHandlerArgs = [request: Request, ctx: unknown];

export type GuardedRouteHandler<
    TArgs extends RouteHandlerArgs = RouteHandlerArgs,
> = (
    ...args: [...TArgs, auth: RouteAuthContext]
) => Promise<Response> | Response;

export type RouteHandler<TArgs extends RouteHandlerArgs = RouteHandlerArgs> = (
    ...args: TArgs
) => Promise<Response> | Response;

interface RouteGuardMeta {
    allowApiKey: boolean;
    allowOauthApp: boolean;
    permission: string | null;
}

interface WrappedRouteHandler<
    TArgs extends RouteHandlerArgs,
> extends RouteHandler<TArgs> {
    __routeGuardMeta: RouteGuardMeta;
    __innerHandler: GuardedRouteHandler<TArgs>;
}

function isWrapped<TArgs extends RouteHandlerArgs>(
    handler: RouteHandler<TArgs> | GuardedRouteHandler<TArgs>,
): handler is WrappedRouteHandler<TArgs> {
    return "__routeGuardMeta" in handler;
}

function unauthorized(): Response {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function insufficientScope(): Response {
    return Response.json({ error: "insufficient_scope" }, { status: 403 });
}

export function createRouteAuth(deps: RouteAuthDeps) {
    function ensureWrapped<TArgs extends RouteHandlerArgs>(
        handler: RouteHandler<TArgs> | GuardedRouteHandler<TArgs>,
    ): WrappedRouteHandler<TArgs> {
        if (isWrapped(handler)) return handler;

        const meta: RouteGuardMeta = {
            allowApiKey: false,
            allowOauthApp: false,
            permission: null,
        };
        const inner = handler as GuardedRouteHandler<TArgs>;

        const wrapped = (async (...args: TArgs) => {
            const [request] = args;
            const authHeader = request.headers.get("Authorization");
            if (!authHeader?.startsWith("Bearer ")) return unauthorized();

            const token = authHeader.slice(7);
            if (!token) return unauthorized();

            let auth: RouteAuthContext | null = null;

            if (meta.allowApiKey) {
                const apiKeyResult = await deps.validator.validateApiKey(token);
                if (apiKeyResult) {
                    auth = {
                        userId: apiKeyResult.userId,
                        authMethod: "apiKey",
                        permissionIds: apiKeyResult.permissionIds,
                        scopes: null,
                    };
                }
            }

            if (!auth && meta.allowOauthApp) {
                const oauthResult =
                    await deps.validator.validateOauthToken(token);
                if (oauthResult) {
                    auth = {
                        userId: oauthResult.userId,
                        authMethod: "oauthApp",
                        permissionIds: null,
                        scopes: oauthResult.scopes,
                    };
                }
            }

            if (!auth) return unauthorized();

            if (meta.permission && !isPermitted(auth, meta.permission))
                return insufficientScope();

            return inner(...args, auth);
        }) as WrappedRouteHandler<TArgs>;

        wrapped.__routeGuardMeta = meta;
        wrapped.__innerHandler = inner;
        return wrapped;
    }

    function APIKeyRoute<TArgs extends RouteHandlerArgs = RouteHandlerArgs>() {
        return (handler: RouteHandler<TArgs> | GuardedRouteHandler<TArgs>) => {
            const wrapped = ensureWrapped(handler);
            wrapped.__routeGuardMeta.allowApiKey = true;
            return wrapped;
        };
    }

    function OauthAppRoute<
        TArgs extends RouteHandlerArgs = RouteHandlerArgs,
    >() {
        return (handler: RouteHandler<TArgs> | GuardedRouteHandler<TArgs>) => {
            const wrapped = ensureWrapped(handler);
            wrapped.__routeGuardMeta.allowOauthApp = true;
            return wrapped;
        };
    }

    function RequirePermission<
        TArgs extends RouteHandlerArgs = RouteHandlerArgs,
    >(permission: string) {
        return (handler: RouteHandler<TArgs> | GuardedRouteHandler<TArgs>) => {
            const wrapped = ensureWrapped(handler);
            wrapped.__routeGuardMeta.permission = permission;
            return wrapped;
        };
    }

    return { APIKeyRoute, OauthAppRoute, RequirePermission };
}
