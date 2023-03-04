import { MyContext, AuthPayload } from "../utils/types";
import { MiddlewareFn } from "type-graphql";
import { verify } from "jsonwebtoken";
import { User } from "../entity/User";

export const isAuth: MiddlewareFn<MyContext> = async ({ context }, next) => {
  try {
    const authorization = context.req.headers.authorization;
    if (!authorization) {
      throw "Not Authenticated";
    }
    const authRegex = /^Bearer/;
    if (!authRegex.test(authorization) || authorization.split(" ").length !== 2) {
      throw "Not Authenticated";
    }
    const base64Token = authorization.split(" ")[1];
    if (Buffer.from(base64Token, "base64").toString("base64") !== base64Token) {
      throw "Not Authenticated";
    }
    const token = Buffer.from(base64Token, "base64").toString("utf-8");
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
    const authPayload = payload as AuthPayload;
    const user = await User.findOne({ where: { id: authPayload.user_id } });
    if (!user) {
      throw "Not Authenticated";
    }
    if (user.token_version !== authPayload.token_version) {
      throw "Not Authenticated";
    }
    context.user_payload = { user };
  } catch (err) {
    console.error(err);
    throw new Error("Not Authenticated");
  }

  return next();
};
