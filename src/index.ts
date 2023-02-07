import "reflect-metadata";
import "dotenv/config";
import { AppDataSource } from "./data-source";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { User } from "./entity/User";
import Redis from "ioredis";
import { verify } from "jsonwebtoken";
import { Payload } from "./utils/types";
import { createAccessToken, createRefreshToken } from "./utils/auth";
import { ACCESS_TOKEN_EXPIRES_IN } from "./utils/constants";

const main = async () => {
  AppDataSource.initialize()
    .then(async () => {
      console.log("connected with typeorm");
      //await User.delete({})
    })
    .catch((error) => console.log(error));

  const app = express();
  const redis = new Redis();
  redis.on("error", (err) => console.log("Redis Client Error", err));

  app.get("/", (_req, res) => {
    res.send("hello world");
  });

  app.post("/refresh_token", async (req, res) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.send({
        ok: false,
        access_token: null,
        refresh_token: null,
        expires_in: null,
        user: null,
      });
    }

    const authRegex = /^Bearer/;

    if (
      !authRegex.test(authorization) ||
      authorization.split(" ").length !== 2
    ) {
      return res.send({
        ok: false,
        access_token: null,
        refresh_token: null,
        expires_in: null,
        user: null,
      });
    }

    try {
      const token = authorization.split(" ")[1];
      const payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
      const userPayload = payload as Payload;
      const user = await User.findOne({ where: { _id: userPayload.user_id } });
      if (!user) {
        return res.send({
          ok: false,
          access_token: null,
          refresh_token: null,
          expires_in: null,
          user: null,
        });
      }
      if (user.token_version !== userPayload.token_version) {
        return res.send({
          ok: false,
          access_token: null,
          refresh_token: null,
          expires_in: null,
          user: null,
        });
      }
      return res.send({
        ok: true,
        access_token: createAccessToken(user),
        refresh_token: createRefreshToken(user),
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
        user: user,
      });
    } catch (err) {
      console.error(err);
      return res.send({
        ok: false,
        access_token: null,
        refresh_token: null,
        expires_in: null,
        user: null,
      });
    }
  });

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  app.listen(8080, () => {
    console.log("express server started on port: 8080");
  });
};

main().catch((err) => {
  console.error(err);
});
