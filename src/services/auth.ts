import { FileSystem } from "@effect/platform"
import { Context, Effect, Layer, Option, Redacted, Ref, Schema } from "effect"
import { homedir } from "os";
import * as path from "path";
import { Store } from "./store";


const AuthSchema = Schema.Struct({
    apiKey: Schema.optional(Schema.Redacted(Schema.String)),
});
type AuthSchema = typeof AuthSchema.Type;

export class Auth extends Context.Tag('Auth')<
    Auth,
    {
        getApiKey: () => Effect.Effect<Option.Option<Redacted.Redacted<string>>>,
        setApiKey: (apiKey: Redacted.Redacted<string>) => Effect.Effect<void>
    }
>() {
    static layerWithoutDependencies = Layer.effect(this, Effect.gen(function* () {
        const store = yield* Store.init(AuthSchema, {});

        return {
            getApiKey: () => store.read().pipe(
                Effect.map(state => Option.fromNullable(state.apiKey))
            ),
            setApiKey: (newApiKey: Redacted.Redacted<string>) => store.write({ apiKey: newApiKey }),
        }
    }))

    static layer = this.layerWithoutDependencies.pipe(
        Layer.provide(Store.layerFs(path.join(homedir(), '.config', 'lin'), "auth.json"))
    )
} 