import KoaRouter from "koa-router";
import Controller from "./controller";
import { RouterContext } from "koa-router";
import bodyParser from "koa-bodyparser";
import { isAdmin } from "@openintegrationhub/iam-utils";
import { koaMiddleware } from "@openintegrationhub/iam-utils";

export default () => {
  const controller = new Controller();
  return new KoaRouter()
    .use(bodyParser())
    .use(koaMiddleware)
    .delete("/", (ctx: RouterContext) => controller.deleteMany(ctx))
    .use((ctx: RouterContext, next) => {
      ctx.state.query = {};

      const user = ctx.state.user;

      if (!isAdmin(user)) {
        ctx.state.query.tenant = user.tenant;
      }

      next();
    })
    .get("/flows/:flowId/steps", (ctx: RouterContext) => controller.getAll(ctx))
    .get("/flows/:flowId/steps/:stepId", (ctx: RouterContext) =>
      controller.getOne(ctx)
    )
    .delete("/flows/:flowId/steps/:stepId", (ctx: RouterContext) =>
      controller.deleteOne(ctx)
    )
    .routes();
};
