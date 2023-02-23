import { MyContext } from "../utils/types";
import { MiddlewareFn } from "type-graphql";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

export const isGoogleAuth: MiddlewareFn<MyContext> = async (
  { context },
  next
) => {
  try {
    const authorization = context.req.headers.authorization;
    if (!authorization) {
      throw "Not Authenticated";
    }
    const authRegex = /^Bearer/;
    if (
      !authRegex.test(authorization) ||
      authorization.split(" ").length !== 2
    ) {
      throw "Not Authenticated";
    }
    const base64Token = authorization.split(" ")[1];
    if (Buffer.from(base64Token, "base64").toString("base64") !== base64Token) {
      throw "Not Authenticated";
    }
    const token = Buffer.from(base64Token, "base64").toString("utf-8");
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw "Not Authenticated";
    }
    context.google_payload = { google_email: payload.email };
  } catch (err) {
    console.log(err);
    throw new Error("Not Authenticated");
  }

  return next();
};
