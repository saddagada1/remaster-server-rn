import { GoogleUser, MyContext } from "../utils/types";
import {
  Resolver,
  Query,
  Mutation,
  InputType,
  Field,
  Arg,
  Ctx,
  ObjectType,
  UseMiddleware,
} from "type-graphql";
import argon2 from "argon2";
import { User } from "../entity/User";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  FORGOT_PASSWORD_PREFIX,
  VERIFY_EMAIL_PREFIX,
} from "../utils/constants";
import { sendEmail } from "../utils/sendEmail";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../data-source";
import {
  createAccessToken,
  createRefreshToken,
  generateOTP,
} from "../utils/auth";
import axios from "axios";
import axiosRetry from "axios-retry";

axiosRetry(axios, {
  retries: 3,
  // retryCondition: (error) => {
  //   return true;
  // },
  onRetry: (retryCount) => {
    console.log("retry: ", retryCount);
  },
});

@InputType()
class RegisterInput {
  @Field()
  email: string;
  @Field()
  username: string;
  @Field()
  password: string;
}

@InputType()
class RegisterWithGoogleInput {
  @Field()
  access_token: string;
  @Field()
  username: string;
}

@InputType()
class LoginInput {
  @Field()
  email: string;
  @Field()
  password: string;
}

@InputType()
class ChangePasswordInput {
  @Field()
  oldPassword: string;
  @Field()
  newPassword: string;
}

@InputType()
class ChangeForgotPasswordInput {
  @Field()
  email: string;
  @Field()
  token: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class Auth {
  @Field()
  access_token: string;
  @Field()
  refresh_token: string;
  @Field()
  expires_in: number;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType()
class AuthResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Auth, { nullable: true })
  auth?: Auth;
}

const fetchGoogleUser = async (access_token: string) => {
  return axios.get(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
  );
};

@Resolver()
export class UserResolver {
  @Mutation(() => AuthResponse)
  async register(
    @Arg("registerOptions") registerOptions: RegisterInput,
    @Ctx() { redis }: MyContext
  ): Promise<AuthResponse> {
    const hashedPassword = await argon2.hash(registerOptions.password);
    let user;
    try {
      user = await User.create({
        email: registerOptions.email,
        username: registerOptions.username,
        password: hashedPassword,
      }).save();
    } catch (err) {
      console.log(err);
      if (err.code === "23505") {
        if (err.detail.includes("username")) {
          return {
            errors: [
              {
                field: "username",
                message: `Username Taken`,
              },
            ],
          };
        }
        if (err.detail.includes("email")) {
          return {
            errors: [
              {
                field: "email",
                message: `Email in Use`,
              },
            ],
          };
        }
      }
    }

    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: `Server Error: Unable to Create User`,
          },
        ],
      };
    }

    const token = await generateOTP();

    await redis.set(
      VERIFY_EMAIL_PREFIX + user._id,
      token,
      "EX",
      1000 * 60 * 60
    ); // 1 hour

    const emailBody = `Your Token is: ${token}`;

    sendEmail(user.email, "REMASTER - VERIFY EMAIL", emailBody);

    return {
      user: user,
      auth: {
        access_token: createAccessToken(user),
        refresh_token: createRefreshToken(user),
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  @Mutation(() => AuthResponse)
  async registerWithGoogle(
    @Arg("registerWithGoogleOptions")
    registerWithGoogleOptions: RegisterWithGoogleInput
  ): Promise<AuthResponse> {
    let googleUser: GoogleUser | null = null;
    try {
      const response = await fetchGoogleUser(
        registerWithGoogleOptions.access_token
      );
      googleUser = response.data;
    } catch (err) {
      console.log("failed to fetch user");
      console.error(err);
      return {
        errors: [
          {
            field: "username",
            message: `Failed to Retrieve Google Account`,
          },
        ],
      };
    }

    let user;
    try {
      user = await User.create({
        email: googleUser!.email,
        username: registerWithGoogleOptions.username,
        verified: true,
      }).save();
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        if (err.detail.includes("username")) {
          return {
            errors: [
              {
                field: "username",
                message: `Username Taken`,
              },
            ],
          };
        }
        if (err.detail.includes("email")) {
          return {
            errors: [
              {
                field: "email",
                message: `Email in Use`,
              },
            ],
          };
        }
      }
    }

    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: `Server Error: Unable to Create User`,
          },
        ],
      };
    }

    return {
      user: user,
      auth: {
        access_token: createAccessToken(user),
        refresh_token: createRefreshToken(user),
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  @Mutation(() => AuthResponse)
  async login(
    @Arg("loginOptions") loginOptions: LoginInput
  ): Promise<AuthResponse> {
    const user = await User.findOne({ where: { email: loginOptions.email } });
    if (!user) {
      return {
        errors: [
          {
            field: "email",
            message: "Invalid Email or Password",
          },
        ],
      };
    }

    if (!user.password) {
      return {
        errors: [
          {
            field: "email",
            message: "Login With Google",
          },
        ],
      };
    }

    const isValid = await argon2.verify(user.password, loginOptions.password);
    if (!isValid) {
      return {
        errors: [
          {
            field: "email",
            message: "Invalid Email or Password",
          },
        ],
      };
    }

    return {
      user: user,
      auth: {
        access_token: createAccessToken(user),
        refresh_token: createRefreshToken(user),
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  @Mutation(() => AuthResponse)
  async loginWithGoogle(
    @Arg("accessToken") accessToken: string
  ): Promise<AuthResponse> {
    let googleUser: GoogleUser | null = null;
    try {
      const response = await fetchGoogleUser(accessToken);
      googleUser = response.data;
    } catch (err) {
      console.log("failed to fetch user");
      console.error(err);
      return {
        errors: [
          {
            field: "google",
            message: `Failed to Retrieve Google Account`,
          },
        ],
      };
    }

    const user = await User.findOne({ where: { email: googleUser!.email } });
    if (!user) {
      return {
        errors: [
          {
            field: "google",
            message: "No Account Found",
          },
        ],
      };
    }

    return {
      user: user,
      auth: {
        access_token: createAccessToken(user),
        refresh_token: createRefreshToken(user),
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  @Mutation(() => UserResponse)
  @UseMiddleware(isAuth)
  async changeUsername(
    @Arg("username") username: string,
    @Ctx() { payload }: MyContext
  ): Promise<UserResponse> {
    const duplicateUser = await User.findOne({
      where: { username: username },
    });
    if (duplicateUser) {
      return {
        errors: [
          {
            field: "username",
            message: "Username Taken",
          },
        ],
      };
    }

    const result = await AppDataSource.createQueryBuilder()
      .update(User)
      .set({ username: username })
      .where({ _id: payload!.user_id })
      .returning("*")
      .execute();

    return { user: result.raw[0] };
  }

  @Mutation(() => UserResponse)
  @UseMiddleware(isAuth)
  async changeEmail(
    @Arg("email") email: string,
    @Ctx() { payload }: MyContext
  ): Promise<UserResponse> {
    const duplicateUser = await User.findOne({ where: { email: email } });
    if (duplicateUser) {
      return {
        errors: [
          {
            field: "email",
            message: "Email in Use",
          },
        ],
      };
    }

    const result = await AppDataSource.createQueryBuilder()
      .update(User)
      .set({ email: email })
      .where({ _id: payload!.user_id })
      .returning("*")
      .execute();

    return { user: result.raw[0] };
  }

  @Mutation(() => UserResponse)
  @UseMiddleware(isAuth)
  async changePassword(
    @Arg("changePasswordOptions") changePasswordOptions: ChangePasswordInput,
    @Ctx() { payload }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne({ where: { _id: payload!.user_id } });

    const isValid = await argon2.verify(
      user!.password!,
      changePasswordOptions.oldPassword
    );
    if (!isValid) {
      return {
        errors: [
          {
            field: "oldPassword",
            message: "Incorrect Password",
          },
        ],
      };
    }

    await User.update(
      { _id: user!._id },
      { password: await argon2.hash(changePasswordOptions.newPassword) }
    );

    return { user: user! };
  }

  @Mutation(() => AuthResponse)
  async changeForgotPassword(
    @Arg("changeForgotPasswordOptions")
    changeForgotPasswordOptions: ChangeForgotPasswordInput,
    @Ctx() { redis }: MyContext
  ): Promise<AuthResponse> {
    const key = FORGOT_PASSWORD_PREFIX + changeForgotPasswordOptions.email;

    const value = await redis.get(key);
    if (!value) {
      return {
        errors: [
          {
            field: "token",
            message: `Token Expired`,
          },
        ],
      };
    }

    const userID = value.split(":")[0];
    const storedToken = value.split(":")[1];

    if (changeForgotPasswordOptions.token !== storedToken) {
      return {
        errors: [
          {
            field: "token",
            message: `Token Invalid`,
          },
        ],
      };
    }

    const numUserID = parseInt(userID);

    const result = await AppDataSource.createQueryBuilder()
      .update(User)
      .set({
        password: await argon2.hash(changeForgotPasswordOptions.password),
        token_version: () => "token_version + 1",
      })
      .where({ _id: numUserID })
      .returning("*")
      .execute();

    await redis.del(key);

    return {
      user: result.raw[0],
      auth: {
        access_token: createAccessToken(result.raw[0]),
        refresh_token: createRefreshToken(result.raw[0]),
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return true;
    }

    const key = FORGOT_PASSWORD_PREFIX + user.email;

    const duplicate = await redis.exists(key);

    if (duplicate !== 0) {
      await redis.del(key);
    }

    const token = await generateOTP();

    await redis.set(key, `${user._id}:${token}`, "EX", 1000 * 60 * 60); // 1 hour

    const emailBody = `Your Token is: ${token}`;

    sendEmail(email, "REMASTER - FORGOT PASSWORD", emailBody);

    return true;
  }

  @Mutation(() => UserResponse)
  @UseMiddleware(isAuth)
  async verifyEmail(
    @Arg("token") token: string,
    @Ctx() { payload, redis }: MyContext
  ): Promise<UserResponse> {
    const key = VERIFY_EMAIL_PREFIX + payload!.user_id;

    const storedToken = await redis.get(key);
    if (!storedToken) {
      return {
        errors: [
          {
            field: "token",
            message: `Token Expired`,
          },
        ],
      };
    }

    if (storedToken !== token) {
      return {
        errors: [
          {
            field: "token",
            message: `Token Invalid`,
          },
        ],
      };
    }

    const result = await AppDataSource.createQueryBuilder()
      .update(User)
      .set({ verified: true })
      .where({ _id: payload!.user_id })
      .returning("*")
      .execute();

    await redis.del(key);

    return { user: result.raw[0] };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async sendVerifyEmail(@Ctx() { payload, redis }: MyContext) {
    const user = await User.findOne({ where: { _id: payload!.user_id } });

    const key = VERIFY_EMAIL_PREFIX + payload!.user_id;

    const duplicate = await redis.exists(key);

    if (duplicate !== 0) {
      await redis.del(key);
    }

    const token = await generateOTP();

    await redis.set(key, token, "EX", 1000 * 60 * 60); // 1 hour

    const emailBody = `Your Token is: ${token}`;

    sendEmail(user!.email, "REMASTER - VERIFY EMAIL", emailBody);

    return true;
  }

  @Query(() => [User])
  users(): Promise<User[]> {
    return User.find();
  }
}
