import { MyContext } from "../utils/types";
import { MiddlewareFn } from "type-graphql";

export const isSpotifyAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  const authorization = context.req.headers.authorization;

  if (!authorization) {
    throw new Error("Not Authenticated");
  }

  const authRegex = /^Bearer/;

  if (!authRegex.test(authorization) || authorization.split(" ").length !== 2) {
    throw new Error("Not Authenticated");
  }

  const base64Token = authorization.split(" ")[1];
  if (Buffer.from(base64Token, "base64").toString("base64") !== base64Token) {
    throw new Error("Not Authenticated");
  }

  const token = Buffer.from(base64Token, "base64").toString("utf-8");
  context.spotify_payload = { spotify_access_token: token };

  return next();
};
