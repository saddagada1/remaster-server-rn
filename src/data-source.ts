import "reflect-metadata";
import { DataSource } from "typeorm";
import { __prod__ } from "./utils/constants";
import { User } from "./entity/User";
import { Remaster } from "./entity/Remaster";
import { Artist } from "./entity/Artist";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: !__prod__,
  logging: !__prod__,
  entities: [User, Remaster, Artist],
  migrations: [],
  subscribers: [],
});
