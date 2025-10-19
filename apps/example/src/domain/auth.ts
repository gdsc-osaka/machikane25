import z from "zod";

export const Uid = z.string().brand<"UID">();
export type Uid = z.infer<typeof Uid>;

export type SessionUser = {
  id: string;
  name: string;
  emailVerified: boolean;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null | undefined;
};

export type AuthUser = SessionUser & {
  uid: Uid;
};

export const convertToAuthUser = (authUser: SessionUser): AuthUser => {
  return {
    ...authUser,
    uid: authUser.id as Uid,
  };
};
