import { Request, Response } from "express";
import { Redis } from "ioredis";

export type MyContext = {
  req: Request;
  res: Response;
  redis: Redis;
  payload?: Payload;
};

export type Payload = {
  user_id: number;
  token_version?: number;
};

export type GoogleUser = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
};
