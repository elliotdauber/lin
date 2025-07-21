import { Context, Effect, Layer, Option, Ref, Schema } from "effect";
import { FileSystem } from "@effect/platform";
import * as path from "path";

type StoreInner<A, I> = {
    read: () => Effect.Effect<A>,
    write: (value: Partial<A>) => Effect.Effect<void>,
}

type StoreInit<A, I> = (schema: Schema.Schema<A, I>, fallback: I) => Effect.Effect<StoreInner<A, I>>

export class StoreInitError extends Schema.TaggedError<StoreInitError>()(
    'StoreInitError',
    {
        message: Schema.String,
        cause: Schema.Unknown,
    },
) { }

export class Store extends Context.Tag('Store')<Store, {
    init: <A, I>(schema: Schema.Schema<A, I>, fallback: I) => Effect.Effect<StoreInner<A, I>>
}>() {
    static layerFs = (dir: string, filename: string) => Layer.effect(this, Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        return Store.of({
            init: <A, I>(schema: Schema.Schema<A, I>, fallback: I) => Effect.gen(function* () {
                const filepath = path.join(dir, filename)
                const initialState = yield* fs.readFileString(filepath).pipe(
                    Effect.flatMap(Schema.decode(Schema.parseJson(schema))),
                ).pipe(
                    Effect.catchAll(() => fs.makeDirectory(dir, { recursive: true }).pipe(
                        Effect.andThen(() => fs.writeFileString(filepath, JSON.stringify({}))),
                        Effect.andThen(() => Schema.decode(schema)(fallback))
                    ))
                );

                const stateRef = yield* Ref.make(initialState);

                return {
                    read: () => Ref.get(stateRef),
                    write: (value) => Effect.gen(function* () {
                        const state = yield* Ref.get(stateRef);
                        const newState = { ...state, ...value };
                        yield* Ref.set(stateRef, newState);
                        const json = yield* Schema.encode(schema)(newState)
                        yield* fs.writeFileString(filepath, JSON.stringify(json))
                    }).pipe(
                        Effect.orDie
                    )
                } satisfies StoreInner<A, I>;
            }).pipe(
                Effect.orDie
            )
        })
    }))

    static init = <A, I>(...args: Parameters<StoreInit<A, I>>) => Store.pipe(
        Effect.flatMap(store => store.init(...args))
    )
}