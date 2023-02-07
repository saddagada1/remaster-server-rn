import { MyContext, Payload } from "../utils/types";
import { MiddlewareFn } from "type-graphql";
import { verify } from "jsonwebtoken";

export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  const authorization = context.req.headers.authorization;

  if (!authorization) {
    throw new Error("Not Authenticated");
  }

  const authRegex = /^Bearer/;

  if (!authRegex.test(authorization) || authorization.split(" ").length !== 2) {
    throw new Error("Not Authenticated");
  }

  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
    context.payload = payload as Payload;
  } catch (err) {
    console.error(err);
    throw new Error("Not Authenticated");
  }

  return next();
};
