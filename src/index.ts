import "reflect-metadata";
import "dotenv/config";
import { AppDataSource } from "./data-source";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";

const main = async () => {
  AppDataSource.initialize()
    .then(() => {
      console.log("connected with typeorm");
    })
    .catch((error) => console.log(error));

  const app = express();

  app.get("/", (_req, res) => {
    res.send("hello world");
  });

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver],
    }),
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
