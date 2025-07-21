import { Config, Context, Effect, Layer, Option, Schema, Redacted } from "effect"
import { LinearClient as Linear } from "@linear/sdk";
import { LinearClientError } from "../schema"
import { Auth } from "./auth";

export class LinearApiKeyNotFound extends Schema.TaggedError<LinearApiKeyNotFound>()(
    'LinearApiKeyNotFound',
    {
    },
) { }

export class LinearClient extends Context.Tag("LinearClient")<LinearClient, {
    use: <A>(fn: (client: Linear) => Promise<A>) => Effect.Effect<A, LinearClientError>;
}>() {
    static layer = Layer.effect(this, Effect.gen(function* () {
        const auth = yield* Auth;

        const client = yield* auth.getApiKey().pipe(
            Effect.flatMap(Option.match({
                onNone: () => new LinearApiKeyNotFound(),
                onSome: Effect.succeed
            })),
            Effect.map((apiKey) => new Linear({ apiKey: Redacted.value(apiKey) }))
        )

        return LinearClient.of({
            use: (fn) => Effect.tryPromise(() => fn(client)).pipe(
                Effect.mapError(e => new LinearClientError({ message: e.message, cause: e })),
            )
        })
    }));
} 