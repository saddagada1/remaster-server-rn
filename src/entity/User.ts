import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  _id!: number;

  @Field()
  @Column({ default: false })
  verified!: boolean;

  @Field()
  @Column("citext", { unique: true })
  email!: string;

  @Field()
  @Column("citext", { unique: true })
  username!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: 0 })
  token_version!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
