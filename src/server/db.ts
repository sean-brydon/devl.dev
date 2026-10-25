import { Context, Effect, Layer } from "effect";
import { DbError, UniqueViolation } from "@/server/errors";
import { type D1Statement, Platform } from "@/server/platform";

type Param = string | number | null;

export class Db extends Context.Service<
  Db,
  {
    all<T>(sql: string, ...params: Param[]): Effect.Effect<T[], DbError>;
    first<T>(sql: string, ...params: Param[]): Effect.Effect<T | null, DbError>;
    run(sql: string, ...params: Param[]): Effect.Effect<number, DbError | UniqueViolation>;
  }
>()("devl/server/Db") {
  static readonly layer = Layer.effect(
    Db,
    Effect.gen(function* () {
      const { db } = yield* Platform;
      const statement = (sql: string, params: Param[]) => db.prepare(sql).bind(...params);
      const query = <A>(run: (stmt: D1Statement) => Promise<A>) => (sql: string, params: Param[]) =>
        Effect.tryPromise({
          try: () => run(statement(sql, params)),
          catch: (cause) => {
            const message = cause instanceof Error ? cause.message : String(cause);
            return /UNIQUE constraint failed/i.test(message) ? new UniqueViolation({ message }) : new DbError({ message });
          },
        });

      return Db.of({
        all: <T>(sql: string, ...params: Param[]) =>
          query((s) => s.all<T>())(sql, params).pipe(
            Effect.map((r) => r.results),
            Effect.catchTag("UniqueViolation", (e) => Effect.fail(new DbError({ message: e.message }))),
          ),
        first: <T>(sql: string, ...params: Param[]) =>
          query((s) => s.first<T>())(sql, params).pipe(
            Effect.catchTag("UniqueViolation", (e) => Effect.fail(new DbError({ message: e.message }))),
          ),
        run: (sql, ...params) => query((s) => s.run())(sql, params).pipe(Effect.map((r) => r.meta.changes)),
      });
    }),
  );
}
