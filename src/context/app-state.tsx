"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  buildNotifications,
  MOCK_COMMENTS,
  MOCK_FOLLOWS,
  MOCK_LIKES,
  MOCK_POSTS,
  MOCK_RESTAURANTS,
  MOCK_SAVES,
  MOCK_USERS,
} from "@/data/mock-data";
import {
  handleToEmail,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  EMPTY_REMOTE_SNAPSHOT,
  fetchCommentsForPost,
  fetchRemoteSnapshot,
  type RemoteSnapshot,
} from "@/lib/supabase/fetch";
import {
  remoteAddComment,
  remoteDeleteComment,
  remoteDeletePost,
  remoteInsertPost,
  remoteInsertRestaurant,
  remoteSetNotificationsEnabled,
  remoteToggleFollow,
  remoteToggleLike,
  remoteToggleSave,
  remoteEnsureUserRow,
  remoteUpdatePost,
  remoteUpdateProfile,
} from "@/lib/supabase/mutations";
import type {
  AppNotification,
  Comment,
  CommentId,
  Follow,
  Like,
  Post,
  PostId,
  Restaurant,
  RestaurantId,
  Save,
  User,
  UserId,
} from "@/types";
import { DEMO_PASSWORD_HASH } from "@/lib/auth-constants";
import {
  loadPersistedAuth,
  savePersistedAuth,
  type PersistedAuth,
} from "@/lib/auth-persist";
import { hashPassword, verifyPassword } from "@/lib/password";
import { handleValidationMessage, normalizeHandle } from "@/lib/validate-handle";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

const MOCK_IDS = new Set(MOCK_USERS.map((u) => u.id));

function seedPasswordMap(): Record<UserId, string> {
  const m: Record<UserId, string> = {};
  for (const u of MOCK_USERS) {
    m[u.id] = DEMO_PASSWORD_HASH;
  }
  return m;
}

type State = {
  users: User[];
  restaurants: Restaurant[];
  posts: Post[];
  comments: Comment[];
  likes: Like[];
  saves: Save[];
  follows: Follow[];
  settings: {
    notificationsEnabled: boolean;
  };
  currentUserId: UserId | null;
  passwordHashes: Record<UserId, string>;
  deletedUserIds: UserId[];
};

type Action =
  | { type: "HYDRATE"; payload: PersistedAuth }
  | { type: "HYDRATE_REMOTE"; payload: RemoteSnapshot }
  | { type: "SET_SESSION"; userId: UserId | null }
  | {
      type: "REGISTER";
      user: User;
      passwordHash: string;
    }
  | { type: "SET_PASSWORD"; userId: UserId; passwordHash: string }
  | { type: "TOGGLE_LIKE"; postId: PostId }
  | { type: "MERGE_POST_LIKES"; postId: PostId; likes: Like[] }
  | { type: "MERGE_POST_SAVES"; postId: PostId; saves: Save[] }
  | { type: "TOGGLE_SAVE"; postId: PostId }
  | {
      type: "ADD_COMMENT";
      postId: PostId;
      body: string;
      id?: CommentId;
      createdAt?: string;
      authorHandle?: string;
    }
  | { type: "SET_POST_COMMENTS"; postId: PostId; comments: Comment[] }
  | { type: "DELETE_COMMENT"; commentId: CommentId }
  | {
      type: "ADD_POST";
      post: Post;
    }
  | { type: "MERGE_POSTS_REMOTE"; posts: Post[] }
  | {
      type: "ADD_RESTAURANT";
      restaurant: Restaurant;
    }
  | {
      type: "UPDATE_POST";
      postId: PostId;
      caption?: string;
      restaurantId: RestaurantId;
    }
  | { type: "DELETE_POST"; postId: PostId }
  | { type: "TOGGLE_FOLLOW"; targetUserId: UserId }
  | {
      type: "UPDATE_USER";
      displayName?: string;
      handle?: string;
      avatarUrl?: string | null;
      bio?: string;
    }
  | { type: "SET_NOTIFICATIONS_ENABLED"; enabled: boolean }
  | { type: "DELETE_ACCOUNT" };

function rebuildUsers(
  deleted: Set<UserId>,
  extra: User[],
): User[] {
  const base = MOCK_USERS.filter((u) => !deleted.has(u.id));
  const seen = new Set(base.map((u) => u.id));
  const merged = [...base];
  for (const u of extra) {
    if (!seen.has(u.id)) {
      seen.add(u.id);
      merged.push(u);
    }
  }
  return merged;
}

function reducer(state: State, action: Action): State {
  const uid = state.currentUserId;

  switch (action.type) {
    case "HYDRATE": {
      const p = action.payload;
      const deleted = new Set(p.deletedUserIds ?? []);
      const users = rebuildUsers(deleted, p.extraUsers ?? []);
      const passwordHashes = {
        ...seedPasswordMap(),
        ...p.passwordHashes,
      };
      const session =
        p.currentUserId &&
        users.some((u) => u.id === p.currentUserId)
          ? p.currentUserId
          : null;
      return {
        ...state,
        users,
        passwordHashes,
        deletedUserIds: [...deleted],
        currentUserId: session,
      };
    }
    case "HYDRATE_REMOTE": {
      const p = action.payload;
      return {
        ...state,
        users: p.users,
        restaurants: p.restaurants,
        posts: p.posts,
        comments: p.comments,
        likes: p.likes,
        saves: p.saves,
        follows: p.follows,
        settings: {
          notificationsEnabled: p.notificationsEnabled,
        },
        passwordHashes: {},
      };
    }
    case "SET_SESSION":
      return { ...state, currentUserId: action.userId };
    case "REGISTER":
      return {
        ...state,
        users: [...state.users, action.user],
        passwordHashes: {
          ...state.passwordHashes,
          [action.user.id]: action.passwordHash,
        },
        currentUserId: action.user.id,
      };
    case "SET_PASSWORD":
      return {
        ...state,
        passwordHashes: {
          ...state.passwordHashes,
          [action.userId]: action.passwordHash,
        },
      };
    case "DELETE_ACCOUNT": {
      if (!uid) return state;
      const deleted = new Set(state.deletedUserIds);
      if (MOCK_IDS.has(uid)) deleted.add(uid);
      const users = state.users.filter((u) => u.id !== uid);
      const { [uid]: _, ...passwordHashes } = state.passwordHashes;
      return {
        ...state,
        currentUserId: null,
        users,
        deletedUserIds: [...deleted],
        passwordHashes,
        posts: state.posts.filter((p) => p.authorId !== uid),
        likes: state.likes.filter((l) => {
          if (l.userId === uid) return false;
          const post = state.posts.find((p) => p.id === l.postId);
          return post ? post.authorId !== uid : false;
        }),
        saves: state.saves.filter((s) => {
          if (s.userId === uid) return false;
          const post = state.posts.find((p) => p.id === s.postId);
          return post ? post.authorId !== uid : false;
        }),
        comments: state.comments.filter((c) => {
          if (c.authorId === uid) return false;
          const post = state.posts.find((p) => p.id === c.postId);
          return post ? post.authorId !== uid : false;
        }),
        follows: state.follows.filter(
          (f) => f.followerId !== uid && f.followingId !== uid,
        ),
      };
    }
    case "MERGE_POST_LIKES": {
      const rest = state.likes.filter((l) => l.postId !== action.postId);
      return { ...state, likes: [...rest, ...action.likes] };
    }
    case "MERGE_POST_SAVES": {
      const rest = state.saves.filter((s) => s.postId !== action.postId);
      return { ...state, saves: [...rest, ...action.saves] };
    }
    case "TOGGLE_LIKE": {
      if (!uid) return state;
      const exists = state.likes.some(
        (l) => l.userId === uid && l.postId === action.postId,
      );
      if (exists) {
        return {
          ...state,
          likes: state.likes.filter(
            (l) => !(l.userId === uid && l.postId === action.postId),
          ),
        };
      }
      return {
        ...state,
        likes: [...state.likes, { userId: uid, postId: action.postId }],
      };
    }
    case "TOGGLE_SAVE": {
      if (!uid) return state;
      const exists = state.saves.some(
        (s) => s.userId === uid && s.postId === action.postId,
      );
      if (exists) {
        return {
          ...state,
          saves: state.saves.filter(
            (s) => !(s.userId === uid && s.postId === action.postId),
          ),
        };
      }
      return {
        ...state,
        saves: [...state.saves, { userId: uid, postId: action.postId }],
      };
    }
    case "ADD_COMMENT": {
      if (!uid) return state;
      const id =
        action.id ??
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `c-${Date.now()}`);
      const createdAt = action.createdAt ?? new Date().toISOString();
      const comment: Comment = {
        id,
        postId: action.postId,
        authorId: uid,
        body: action.body,
        createdAt,
        authorHandle: action.authorHandle,
      };
      return { ...state, comments: [...state.comments, comment] };
    }
    case "SET_POST_COMMENTS": {
      const rest = state.comments.filter((c) => c.postId !== action.postId);
      return { ...state, comments: [...rest, ...action.comments] };
    }
    case "DELETE_COMMENT": {
      return {
        ...state,
        comments: state.comments.filter((c) => c.id !== action.commentId),
      };
    }
    case "ADD_POST":
      return { ...state, posts: [action.post, ...state.posts] };
    case "MERGE_POSTS_REMOTE": {
      const map = new Map(state.posts.map((p) => [p.id, p]));
      for (const p of action.posts) {
        map.set(p.id, p);
      }
      return { ...state, posts: [...map.values()] };
    }
    case "ADD_RESTAURANT":
      if (state.restaurants.some((r) => r.id === action.restaurant.id)) {
        return state;
      }
      return {
        ...state,
        restaurants: [...state.restaurants, action.restaurant],
      };
    case "UPDATE_POST": {
      if (!uid) return state;
      const target = state.posts.find((p) => p.id === action.postId);
      if (!target || target.authorId !== uid) return state;
      return {
        ...state,
        posts: state.posts.map((p) => {
          if (p.id !== action.postId) return p;
          return {
            ...p,
            caption: action.caption,
            restaurantId: action.restaurantId,
          };
        }),
      };
    }
    case "DELETE_POST": {
      if (!uid) return state;
      const target = state.posts.find((p) => p.id === action.postId);
      if (!target || target.authorId !== uid) return state;
      return {
        ...state,
        posts: state.posts.filter((p) => p.id !== action.postId),
        likes: state.likes.filter((l) => l.postId !== action.postId),
        saves: state.saves.filter((s) => s.postId !== action.postId),
        comments: state.comments.filter((c) => c.postId !== action.postId),
      };
    }
    case "TOGGLE_FOLLOW": {
      if (!uid || action.targetUserId === uid) return state;
      const exists = state.follows.some(
        (f) =>
          f.followerId === uid && f.followingId === action.targetUserId,
      );
      if (exists) {
        return {
          ...state,
          follows: state.follows.filter(
            (f) =>
              !(
                f.followerId === uid &&
                f.followingId === action.targetUserId
              ),
          ),
        };
      }
      return {
        ...state,
        follows: [
          ...state.follows,
          { followerId: uid, followingId: action.targetUserId },
        ],
      };
    }
    case "UPDATE_USER": {
      if (!uid) return state;
      const me = state.users.find((u) => u.id === uid);
      if (!me) return state;
      const rawHandle =
        action.handle !== undefined ? action.handle.trim() : me.handle;
      const normalizedHandle = normalizeHandle(rawHandle);
      if (action.handle !== undefined) {
        if (!/^[a-z0-9]{3,15}$/.test(normalizedHandle)) {
          return state;
        }
      }
      const handleTaken = state.users.some(
        (u) =>
          u.id !== uid && u.handle.toLowerCase() === normalizedHandle,
      );
      if (handleTaken) return state;
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== uid) return u;
          return {
            ...u,
            displayName:
              action.displayName !== undefined
                ? action.displayName.trim() || u.displayName
                : u.displayName,
            handle:
              action.handle !== undefined ? normalizedHandle : u.handle,
            avatarUrl:
              action.avatarUrl !== undefined
                ? action.avatarUrl
                : u.avatarUrl,
            bio: action.bio !== undefined ? action.bio.trim() : u.bio,
          };
        }),
      };
    }
    case "SET_NOTIFICATIONS_ENABLED":
      return {
        ...state,
        settings: {
          ...state.settings,
          notificationsEnabled: action.enabled,
        },
      };
    default:
      return state;
  }
}

const initialState: State = {
  users: [...MOCK_USERS],
  restaurants: MOCK_RESTAURANTS,
  posts: MOCK_POSTS,
  comments: MOCK_COMMENTS,
  likes: MOCK_LIKES,
  saves: MOCK_SAVES,
  follows: MOCK_FOLLOWS,
  settings: {
    notificationsEnabled: true,
  },
  currentUserId: null,
  passwordHashes: seedPasswordMap(),
  deletedUserIds: [],
};

function toPersistedAuth(state: State): PersistedAuth {
  const extraUsers = state.users.filter((u) => !MOCK_IDS.has(u.id));
  return {
    currentUserId: state.currentUserId,
    passwordHashes: state.passwordHashes,
    extraUsers,
    deletedUserIds: state.deletedUserIds,
  };
}

type AppContextValue = {
  /** False until localStorage (local) or Supabase auth resolves. */
  bootstrapReady: boolean;
  /** Data and auth are backed by Supabase. */
  supabaseMode: boolean;
  /**
   * Supabase Auth user from `getUser()`. `undefined` until first resolution;
   * `null` when signed out (or local-only mode after init).
   */
  currentUser: SupabaseAuthUser | null | undefined;
  currentUserId: UserId | null;
  state: State;
  dispatch: React.Dispatch<Action>;
  getUser: (id: UserId) => User | undefined;
  getRestaurant: (id: string) => Restaurant | undefined;
  getRestaurantBySlug: (slug: string) => Restaurant | undefined;
  getPost: (id: PostId) => Post | undefined;
  likeCount: (postId: PostId) => number;
  isLikedByMe: (postId: PostId) => boolean;
  isSavedByMe: (postId: PostId) => boolean;
  commentsForPost: (postId: PostId) => Comment[];
  followingFeedPosts: () => Post[];
  explorePosts: () => Post[];
  notifications: () => AppNotification[];
  savedPosts: () => Post[];
  toggleLike: (postId: PostId) => void;
  toggleSave: (postId: PostId) => void;
  addComment: (postId: PostId, body: string) => void | Promise<void>;
  deleteComment: (
    commentId: CommentId,
    postIdHint?: PostId,
  ) => Promise<void>;
  addPost: (post: Post) => void | Promise<void>;
  addRestaurant: (restaurant: Restaurant) => void | Promise<void>;
  updatePost: (args: {
    postId: PostId;
    caption?: string;
    restaurantId: RestaurantId;
  }) => void | Promise<void>;
  deletePost: (postId: PostId) => void | Promise<void>;
  getUserByHandle: (handle: string) => User | undefined;
  isFollowing: (userId: UserId) => boolean;
  toggleFollow: (targetUserId: UserId) => void;
  followersForUser: (userId: UserId) => User[];
  followingForUser: (userId: UserId) => User[];
  updateProfile: (args: {
    displayName?: string;
    handle?: string;
    avatarUrl?: string | null;
    bio?: string;
  }) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => void | Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (
    handle: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  adminResetPassword: (
    userId: UserId,
    newPassword: string,
  ) => Promise<void>;
  logout: () => void | Promise<void>;
  deleteAccount: () => void | Promise<void>;
  /** Re-fetch posts/follows from Supabase and replace remote snapshot. */
  refreshRemoteData: () => Promise<{ ok: boolean; error?: string }>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<
    SupabaseAuthUser | null | undefined
  >(undefined);
  const supabaseMode = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setCurrentUser(null);
        setBootstrapReady(true);
        return undefined;
      }

      const initUser = async () => {
        try {
          const { data } = await supabase.auth.getUser();
          if (cancelled) return;
          const user = data.user ?? null;
          setCurrentUser(user);
          if (user?.id) {
            dispatch({ type: "SET_SESSION", userId: user.id });
          } else {
            dispatch({ type: "SET_SESSION", userId: null });
            dispatch({
              type: "HYDRATE_REMOTE",
              payload: EMPTY_REMOTE_SNAPSHOT,
            });
          }
          setBootstrapReady(true);

          if (user?.id) {
            void (async () => {
              const { snapshot, error } = await fetchRemoteSnapshot(
                supabase,
                user.id,
              );
              if (cancelled) return;
              if (!error) {
                dispatch({ type: "HYDRATE_REMOTE", payload: snapshot });
              }
            })();
          }
        } catch {
          if (!cancelled) {
            setCurrentUser(null);
            dispatch({ type: "SET_SESSION", userId: null });
            dispatch({
              type: "HYDRATE_REMOTE",
              payload: EMPTY_REMOTE_SNAPSHOT,
            });
            setBootstrapReady(true);
          }
        }
      };

      void initUser();

      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (cancelled) return;
          if (event === "INITIAL_SESSION") return;
          const client = getSupabaseBrowserClient();
          if (!client) return;
          setCurrentUser(session?.user ?? null);
          if (session?.user?.id) {
            dispatch({ type: "SET_SESSION", userId: session.user.id });
            void (async () => {
              const { snapshot, error } = await fetchRemoteSnapshot(
                client,
                session.user.id,
              );
              if (!error) {
                dispatch({ type: "HYDRATE_REMOTE", payload: snapshot });
              }
            })();
          } else {
            dispatch({ type: "SET_SESSION", userId: null });
            dispatch({
              type: "HYDRATE_REMOTE",
              payload: EMPTY_REMOTE_SNAPSHOT,
            });
          }
        },
      );
      unsub = () => data.subscription.unsubscribe();
      return () => {
        cancelled = true;
        unsub?.();
      };
    }

    setCurrentUser(null);
    const p = loadPersistedAuth();
    if (p) {
      dispatch({ type: "HYDRATE", payload: p });
    }
    setBootstrapReady(true);
    return undefined;
  }, []);

  useEffect(() => {
    if (!bootstrapReady || typeof window === "undefined") return;
    if (isSupabaseConfigured()) return;
    savePersistedAuth(toPersistedAuth(state));
  }, [state, bootstrapReady]);

  const updateProfile = useCallback(
    async (args: {
      displayName?: string;
      handle?: string;
      avatarUrl?: string | null;
      bio?: string;
    }) => {
      const uid = state.currentUserId;
      if (!uid) return;
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await remoteUpdateProfile(supabase, uid, args);
        if (!error) dispatch({ type: "UPDATE_USER", ...args });
        return;
      }
      dispatch({ type: "UPDATE_USER", ...args });
    },
    [state.currentUserId],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const trimmed = email.trim();
      const supabase = getSupabaseBrowserClient();
      console.log("supabase client:", supabase);
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) {
          return { ok: false, error: "Invalid email or password." };
        }
        return { ok: true };
      }
      const resolvedEmail = trimmed.includes("@")
        ? trimmed.toLowerCase()
        : handleToEmail(normalizeHandle(trimmed)).toLowerCase();
      const found = state.users.find(
        (u) => handleToEmail(u.handle).toLowerCase() === resolvedEmail,
      );
      if (!found) {
        return { ok: false, error: "Invalid email or password." };
      }
      const hash = state.passwordHashes[found.id];
      if (!hash || !(await verifyPassword(password, hash))) {
        return { ok: false, error: "Invalid email or password." };
      }
      dispatch({ type: "SET_SESSION", userId: found.id });
      return { ok: true };
    },
    [state.users, state.passwordHashes],
  );

  const signup = useCallback(
    async (handle: string, email: string, password: string) => {
      try {
        const safeEmail = String(email ?? "").trim();
        const safePassword = String(password ?? "");
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          console.error("signup error:", "Supabase client is undefined");
          return { ok: false, error: "Supabase client is undefined" };
        }

        console.log("supabase:", supabase);
        const h = normalizeHandle(handle);
        const hv = handleValidationMessage(handle);
        if (hv) {
          return { ok: false, error: hv };
        }
        const { data, error } = await supabase.auth.signUp({
          email: safeEmail,
          password: safePassword,
          options: {
            data: {
              handle: h,
              display_name: h,
            },
          },
        });

        if (error) {
          console.error("signup error:", error);
          return { ok: false, error: error.message };
        }

        const authUser = data.user;
        if (authUser) {
          const ins = await remoteEnsureUserRow(supabase, {
            id: authUser.id,
            email: authUser.email ?? safeEmail,
            handle: h,
            displayName: h,
          });
          if (ins.error) {
            console.error("users table upsert:", ins.error);
            return { ok: false, error: ins.error };
          }
        }

        console.log("signup success:", data);
        return { ok: true };
      } catch (error) {
        console.error("signup error:", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Signup failed",
        };
      }
    },
    [],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const uid = state.currentUserId;
      if (!uid) return { ok: false, error: "Not signed in." };
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const me = state.users.find((u) => u.id === uid);
        if (!me) return { ok: false, error: "Not signed in." };
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: handleToEmail(me.handle),
          password: currentPassword,
        });
        if (signErr) {
          return { ok: false, error: "Current password is incorrect." };
        }
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      const hash = state.passwordHashes[uid];
      if (!hash || !(await verifyPassword(currentPassword, hash))) {
        return { ok: false, error: "Current password is incorrect." };
      }
      const next = await hashPassword(newPassword);
      dispatch({ type: "SET_PASSWORD", userId: uid, passwordHash: next });
      return { ok: true };
    },
    [state.currentUserId, state.passwordHashes, state.users],
  );

  const adminResetPassword = useCallback(
    async (userId: UserId, newPassword: string) => {
      if (getSupabaseBrowserClient()) {
        return;
      }
      const next = await hashPassword(newPassword);
      dispatch({ type: "SET_PASSWORD", userId, passwordHash: next });
    },
    [],
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      const uid = state.currentUserId;
      const supabase = getSupabaseBrowserClient();
      if (supabase && uid) {
        const { error } = await remoteSetNotificationsEnabled(
          supabase,
          uid,
          enabled,
        );
        if (!error) {
          dispatch({ type: "SET_NOTIFICATIONS_ENABLED", enabled });
        }
        return;
      }
      dispatch({ type: "SET_NOTIFICATIONS_ENABLED", enabled });
    },
    [state.currentUserId],
  );

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      setCurrentUser(null);
      await supabase.auth.signOut();
      return;
    }
    dispatch({ type: "SET_SESSION", userId: null });
  }, []);

  const refreshRemoteData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { ok: true as const };
    }
    const supabase = getSupabaseBrowserClient();
    const uid = state.currentUserId;
    if (!supabase || !uid) {
      console.warn("[refreshRemoteData] skipped: missing client or user id");
      return { ok: false, error: "Not signed in" };
    }
    const { snapshot, error } = await fetchRemoteSnapshot(supabase, uid);
    if (error) {
      console.error("[refreshRemoteData] failed:", error);
      return { ok: false, error };
    }
    dispatch({ type: "HYDRATE_REMOTE", payload: snapshot });
    return { ok: true };
  }, [state.currentUserId]);

  const deleteAccount = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      setCurrentUser(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        await fetch("/api/account/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
      }
      await supabase.auth.signOut();
      dispatch({ type: "SET_SESSION", userId: null });
      dispatch({ type: "HYDRATE_REMOTE", payload: EMPTY_REMOTE_SNAPSHOT });
      return;
    }
    dispatch({ type: "DELETE_ACCOUNT" });
  }, []);

  const getUser = useCallback(
    (id: UserId) => state.users.find((u) => u.id === id),
    [state.users],
  );

  const getRestaurant = useCallback(
    (id: string) => state.restaurants.find((r) => r.id === id),
    [state.restaurants],
  );

  const getRestaurantBySlug = useCallback(
    (slug: string) => state.restaurants.find((r) => r.slug === slug),
    [state.restaurants],
  );

  const getPost = useCallback(
    (id: PostId) => state.posts.find((p) => p.id === id),
    [state.posts],
  );

  const likeCount = useCallback(
    (postId: PostId) => state.likes.filter((l) => l.postId === postId).length,
    [state.likes],
  );

  const currentUserId = state.currentUserId;

  const isLikedByMe = useCallback(
    (postId: PostId) =>
      currentUserId
        ? state.likes.some(
            (l) => l.userId === currentUserId && l.postId === postId,
          )
        : false,
    [state.likes, currentUserId],
  );

  const isSavedByMe = useCallback(
    (postId: PostId) =>
      currentUserId
        ? state.saves.some(
            (s) => s.userId === currentUserId && s.postId === postId,
          )
        : false,
    [state.saves, currentUserId],
  );

  const commentsForPost = useCallback(
    (postId: PostId) =>
      state.comments
        .filter((c) => c.postId === postId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [state.comments],
  );

  const myFollowingIds = useMemo(() => {
    const s = new Set<UserId>();
    if (!currentUserId) return s;
    for (const f of state.follows) {
      if (f.followerId === currentUserId) s.add(f.followingId);
    }
    return s;
  }, [state.follows, currentUserId]);

  const followingFeedPosts = useCallback(() => {
    if (!currentUserId) return [];
    if (supabaseMode) {
      const allowed = new Set<UserId>([
        currentUserId,
        ...Array.from(myFollowingIds),
      ]);
      return [...state.posts]
        .filter((p) => allowed.has(p.authorId))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
    return state.posts.filter((p) => {
      const fromCircle =
        p.authorId === currentUserId || myFollowingIds.has(p.authorId);
      const visible = p.isPublic || p.authorId === currentUserId;
      return fromCircle && visible;
    });
  }, [state.posts, myFollowingIds, currentUserId, supabaseMode]);

  const explorePosts = useCallback(() => {
    return state.posts.filter((p) => p.isPublic);
  }, [state.posts]);

  const notifications = useCallback(() => {
    if (!state.settings.notificationsEnabled || !currentUserId) return [];
    return buildNotifications(
      state.posts,
      state.likes,
      state.comments,
      state.follows,
      currentUserId,
    );
  }, [
    state.posts,
    state.likes,
    state.comments,
    state.follows,
    state.settings.notificationsEnabled,
    currentUserId,
  ]);

  const savedPosts = useCallback(() => {
    if (!currentUserId) return [];
    const ids = new Set(
      state.saves
        .filter((s) => s.userId === currentUserId)
        .map((s) => s.postId),
    );
    return state.posts.filter((p) => ids.has(p.id));
  }, [state.posts, state.saves, currentUserId]);

  const toggleLike = useCallback(
    (postId: PostId) => {
      const uid = state.currentUserId;
      if (!uid) return;
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const liked = state.likes.some(
          (l) => l.userId === uid && l.postId === postId,
        );
        void remoteToggleLike(supabase, uid, postId, liked).then(
          ({ error }) => {
            if (error) {
              console.error("[toggleLike]", postId, error);
              return;
            }
            dispatch({ type: "TOGGLE_LIKE", postId });
          },
        );
        return;
      }
      dispatch({ type: "TOGGLE_LIKE", postId });
    },
    [state.currentUserId, state.likes],
  );

  const toggleSave = useCallback(
    (postId: PostId) => {
      const uid = state.currentUserId;
      if (!uid) return;
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const saved = state.saves.some(
          (s) => s.userId === uid && s.postId === postId,
        );
        void remoteToggleSave(supabase, uid, postId, saved).then(
          ({ error }) => {
            if (!error) dispatch({ type: "TOGGLE_SAVE", postId });
          },
        );
        return;
      }
      dispatch({ type: "TOGGLE_SAVE", postId });
    },
    [state.currentUserId, state.saves],
  );

  const addComment = useCallback(
    async (postId: PostId, body: string) => {
      const uid = state.currentUserId;
      if (!uid) return;
      const trimmed = body.trim();
      if (!trimmed) return;
      const me = state.users.find((u) => u.id === uid);
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await remoteAddComment(supabase, {
          postId,
          authorId: uid,
          body: trimmed,
        });
        if (error) return;
        const { comments, error: fetchErr } = await fetchCommentsForPost(
          supabase,
          postId,
        );
        if (!fetchErr) {
          dispatch({ type: "SET_POST_COMMENTS", postId, comments });
        }
        return;
      }
      dispatch({
        type: "ADD_COMMENT",
        postId,
        body: trimmed,
        authorHandle: me?.displayName ?? me?.handle,
      });
    },
    [state.currentUserId, state.users],
  );

  const deleteComment = useCallback(
    async (commentId: CommentId, postIdHint?: PostId) => {
      const uid = state.currentUserId;
      if (!uid) return;
      const postId =
        postIdHint ??
        state.comments.find((c) => c.id === commentId)?.postId;
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await remoteDeleteComment(supabase, commentId, uid);
        if (error) return;
        if (postId) {
          const { comments, error: fetchErr } = await fetchCommentsForPost(
            supabase,
            postId,
          );
          if (!fetchErr) {
            dispatch({ type: "SET_POST_COMMENTS", postId, comments });
          }
        }
        return;
      }
      dispatch({ type: "DELETE_COMMENT", commentId });
    },
    [state.currentUserId, state.comments],
  );

  const addPost = useCallback(async (post: Post) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await remoteInsertPost(supabase, post);
      if (!error) dispatch({ type: "ADD_POST", post });
      return;
    }
    dispatch({ type: "ADD_POST", post });
  }, []);

  const addRestaurant = useCallback(async (restaurant: Restaurant) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await remoteInsertRestaurant(supabase, restaurant);
      if (!error) dispatch({ type: "ADD_RESTAURANT", restaurant });
      return;
    }
    dispatch({ type: "ADD_RESTAURANT", restaurant });
  }, []);

  const updatePost = useCallback(
    async (args: {
      postId: PostId;
      caption?: string;
      restaurantId: RestaurantId;
    }) => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await remoteUpdatePost(supabase, args);
        if (!error) {
          dispatch({
            type: "UPDATE_POST",
            postId: args.postId,
            caption: args.caption,
            restaurantId: args.restaurantId,
          });
        }
        return;
      }
      dispatch({
        type: "UPDATE_POST",
        postId: args.postId,
        caption: args.caption,
        restaurantId: args.restaurantId,
      });
    },
    [],
  );

  const deletePost = useCallback(async (postId: PostId) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await remoteDeletePost(supabase, postId);
      if (!error) dispatch({ type: "DELETE_POST", postId });
      return;
    }
    dispatch({ type: "DELETE_POST", postId });
  }, []);

  const getUserByHandle = useCallback(
    (handle: string) => {
      const h = handle.trim().toLowerCase();
      return state.users.find((u) => u.handle.toLowerCase() === h);
    },
    [state.users],
  );

  const isFollowing = useCallback(
    (userId: UserId) =>
      currentUserId
        ? state.follows.some(
            (f) =>
              f.followerId === currentUserId && f.followingId === userId,
          )
        : false,
    [state.follows, currentUserId],
  );

  const toggleFollow = useCallback(
    (targetUserId: UserId) => {
      const uid = state.currentUserId;
      if (!uid) return;
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const following = state.follows.some(
          (f) =>
            f.followerId === uid && f.followingId === targetUserId,
        );
        void remoteToggleFollow(supabase, uid, targetUserId, following).then(
          ({ error }) => {
            if (!error) {
              dispatch({ type: "TOGGLE_FOLLOW", targetUserId });
            }
          },
        );
        return;
      }
      dispatch({ type: "TOGGLE_FOLLOW", targetUserId });
    },
    [state.currentUserId, state.follows],
  );

  const followersForUser = useCallback(
    (userId: UserId) => {
      const ids = state.follows
        .filter((f) => f.followingId === userId)
        .map((f) => f.followerId);
      const out = ids
        .map((id) => state.users.find((u) => u.id === id))
        .filter((u): u is User => u != null);
      return [...out].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );
    },
    [state.follows, state.users],
  );

  const followingForUser = useCallback(
    (userId: UserId) => {
      const ids = state.follows
        .filter((f) => f.followerId === userId)
        .map((f) => f.followingId);
      const out = ids
        .map((id) => state.users.find((u) => u.id === id))
        .filter((u): u is User => u != null);
      return [...out].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );
    },
    [state.follows, state.users],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      bootstrapReady,
      supabaseMode,
      currentUser,
      currentUserId,
      state,
      dispatch,
      getUser,
      getRestaurant,
      getRestaurantBySlug,
      getPost,
      likeCount,
      isLikedByMe,
      isSavedByMe,
      commentsForPost,
      followingFeedPosts,
      explorePosts,
      notifications,
      savedPosts,
      toggleLike,
      toggleSave,
      addComment,
      deleteComment,
      addPost,
      addRestaurant,
      updatePost,
      deletePost,
      getUserByHandle,
      isFollowing,
      toggleFollow,
      followersForUser,
      followingForUser,
      updateProfile,
      setNotificationsEnabled,
      login,
      signup,
      changePassword,
      adminResetPassword,
      logout,
      deleteAccount,
      refreshRemoteData,
    }),
    [
      bootstrapReady,
      supabaseMode,
      currentUser,
      currentUserId,
      state,
      getUser,
      getRestaurant,
      getRestaurantBySlug,
      getPost,
      likeCount,
      isLikedByMe,
      isSavedByMe,
      commentsForPost,
      followingFeedPosts,
      explorePosts,
      notifications,
      savedPosts,
      toggleLike,
      toggleSave,
      addComment,
      deleteComment,
      addPost,
      addRestaurant,
      updatePost,
      deletePost,
      getUserByHandle,
      isFollowing,
      toggleFollow,
      followersForUser,
      followingForUser,
      updateProfile,
      setNotificationsEnabled,
      login,
      signup,
      changePassword,
      adminResetPassword,
      logout,
      deleteAccount,
      refreshRemoteData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
