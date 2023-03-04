import { Remaster } from "../entity/Remaster";
import { Resolver, Query, Arg, Mutation, Ctx, UseMiddleware, InputType, Field } from "type-graphql";
import { MyContext } from "../utils/types";
import { isAuth } from "../middleware/isAuth";
import { Artist } from "../entity/Artist";

@InputType()
class KeyInput {
  @Field()
  id!: number;
  @Field()
  note!: string;
  @Field()
  colour!: string;
}

@InputType()
class TuningInput {
  @Field()
  id!: number;
  @Field()
  name!: string;
  @Field(() => [String])
  notes!: string[];
}

@InputType()
class CreateRemasterInput {
  @Field()
  name: string;
  @Field()
  artist: string;
  @Field()
  videoID: string;
  @Field()
  duration: number;
  @Field(() => KeyInput)
  key: KeyInput;
  @Field(() => TuningInput)
  tuning: TuningInput;
}

@Resolver()
export class RemasterResolver {
  @Query(() => [Remaster])
  remasters(): Promise<Remaster[]> {
    return Remaster.find();
  }

  @Query(() => Remaster, { nullable: true })
  remaster(@Arg("id") id: number): Promise<Remaster | null> {
    return Remaster.findOne({ where: { id: id } });
  }

  @Query(() => Remaster, { nullable: true })
  @UseMiddleware(isAuth)
  async userRemaster(
    @Arg("id") id: number,
    @Ctx() { user_payload }: MyContext
  ): Promise<Remaster | null> {
    const remaster = await Remaster.findOne({
      where: { id: id },
      relations: { artist: true },
    });

    if (!remaster) {
      return null;
    }

    if (remaster.creator_id !== user_payload!.user.id) {
      return null;
    }

    return remaster;
  }

  @Query(() => [Remaster])
  @UseMiddleware(isAuth)
  async userRemasters(@Ctx() { user_payload }: MyContext): Promise<Remaster[]> {
    return Remaster.find({
      where: { creator_id: user_payload!.user.id },
      relations: { artist: true },
    });
  }

  @Mutation(() => Remaster)
  @UseMiddleware(isAuth)
  async createRemaster(
    @Arg("remasterInput") remasterInput: CreateRemasterInput,
    @Ctx() { user_payload }: MyContext
  ): Promise<Remaster> {
    let artist = await Artist.findOne({
      where: { name: remasterInput.artist },
    });
    if (!artist) {
      artist = await Artist.create({
        name: remasterInput.artist,
      }).save();
    }

    return Remaster.create({
      name: remasterInput.name,
      artist_id: artist!.id,
      video_id: remasterInput.videoID,
      duration: remasterInput.duration,
      key: remasterInput.key,
      tuning: remasterInput.tuning,
      creator_id: user_payload!.user.id,
    }).save();
  }

  // @Mutation(() => Remaster, {nullable: true})
  // async updateRemaster(
  //     @Arg('id') _id: number,
  //     @Arg('name', () => String, {nullable: true}) name: string
  // ): Promise<Remaster | null> {
  //     const remaster = await Remaster.findOne({where: {_id: _id}})
  //     if(!remaster) {
  //         return null;
  //     }
  //     if(typeof name !== undefined) {
  //         await Remaster.update({_id}, {name});
  //     }
  //     return remaster
  // }

  // @Mutation(() => Boolean)
  // async deleteRemaster(
  //     @Arg('id') _id: number
  // ): Promise<Boolean> {
  //     await Remaster.delete(_id);
  //     return true;
  // }
}
