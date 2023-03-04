import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Artist } from "./Artist";
import { User } from "./User";

@ObjectType()
class Barre {
  // @ts-ignore
  @Field()
  fromString!: number;
  // @ts-ignore
  @Field()
  toString!: number;
  // @ts-ignore
  @Field()
  fret!: number;
}

@ObjectType()
class Chord {
  @Field(() => String || undefined)
  title: string | undefined;
  @Field(() => [[Number]])
  fingers!: [number][];
  @Field(() => [Barre])
  barres!: Barre[];
  @Field()
  position!: number;
}

@ObjectType()
class Key {
  @Field()
  id!: number;
  @Field()
  note!: string;
  @Field()
  colour!: string;
}

@ObjectType()
class Tuning {
  @Field()
  id!: number;
  @Field()
  name!: string;
  @Field(() => [String])
  notes!: string[];
}

@ObjectType()
class Loop {
  @Field()
  id!: number;
  @Field()
  name!: string;
  @Field(() => Key)
  key!: Key;
  @Field()
  type!: string;
  @Field()
  start!: number;
  @Field()
  end!: number;
  @Field(() => Chord, { nullable: true })
  chord?: Chord;
  @Field({ nullable: true })
  tab?: string;
}

@ObjectType()
@Entity()
export class Remaster extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  name!: string;

  @Field()
  @Column()
  artist_id!: number;

  @Field(() => Artist)
  @ManyToOne(() => Artist, (artist) => artist.remasters)
  @JoinColumn({ name: "artist_id" })
  artist!: Artist;

  @Field()
  @Column()
  video_id!: string;

  @Field()
  @Column()
  duration!: number;

  @Field(() => Key)
  @Column("jsonb")
  key!: Key;

  @Field(() => Tuning)
  @Column("jsonb")
  tuning!: Tuning;

  @Field(() => [Loop])
  @Column("jsonb", { array: true, default: [] })
  loops!: Loop[];

  @Field()
  @Column({ type: "int", default: 0 })
  likes!: number;

  @Field()
  @Column()
  creator_id!: number;

  @ManyToOne(() => User, (user) => user.remasters)
  @JoinColumn({ name: "creator_id" })
  creator!: User;

  @Field(() => String)
  @CreateDateColumn()
  created_at: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updated_at: Date;
}
