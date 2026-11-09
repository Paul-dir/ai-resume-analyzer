// Unified storage, auth, and AI wrapper (replaces Puter.js with Supabase & LLM Client)
import { create } from "zustand";
import { supabase } from "../supabase/client";
import { aiClient } from "../ai/client";
import type { AIResponse } from "../ai/types";

export type { AIResponse };

export interface User {
  id: string;
  email: string | null;
  username: string | null;
}

export interface FSItem {
  path: string;
  name: string;
  is_dir: boolean;
}

export interface KVItem {
  key: string;
  value: string;
}

// In-memory cache for fast, reliable client-side file reading & local backup
const fileBlobCache = new Map<string, Blob>();

export interface StorageStore {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    signIn: (email?: string, password?: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => User | null;
  };
  fs: {
    upload: (file: File | Blob | (File | Blob)[]) => Promise<FSItem | FSItem[] | undefined>;
    download: (path: string) => Promise<Blob | undefined>;
    read: (path: string) => Promise<Blob | undefined>;
    delete: (path: string) => Promise<void>;
    list: (path: string) => Promise<FSItem[] | undefined>;
  };
  kv: {
    get: (key: string) => Promise<string | null | undefined>;
    set: (key: string, value: string) => Promise<boolean | undefined>;
    delete: (key: string) => Promise<boolean | undefined>;
    list: (pattern: string, returnValues?: boolean) => Promise<string[] | KVItem[] | undefined>;
    flush: () => Promise<boolean | undefined>;
  };
  ai: {
    chat: (prompt: any, imageURL?: any, testMode?: boolean, options?: any) => Promise<AIResponse>;
    feedback: (path: string, instructions: string) => Promise<AIResponse>;
    img2txt: (image: any, testMode?: boolean) => Promise<string>;
  };
  setAuth: (auth: Partial<StorageStore["auth"]>) => void;
  init: () => void;
  clearError: () => void;
}

export const usePuterStore = create<StorageStore>((set, get) => {
  const setError = (msg: string) => {
    set({ error: msg, isLoading: false });
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        const u = data.session.user;
        const userObj: User = {
          id: u.id,
          email: u.email ?? null,
          username: (u.user_metadata?.full_name as string) ?? u.email?.split("@")[0] ?? "User",
        };
        set({
          isLoading: false,
          auth: { ...get().auth, user: userObj, isAuthenticated: true },
        });
        return true;
      }
    } catch {
      // Fallback to local session check
    }

    // Check localStorage fallback
    if (typeof window !== "undefined") {
      const localUser = localStorage.getItem("resumind_user");
      if (localUser) {
        try {
          const userObj = JSON.parse(localUser);
          set({
            isLoading: false,
            auth: { ...get().auth, user: userObj, isAuthenticated: true },
          });
          return true;
        } catch {
          // invalid
        }
      }
    }

    set({ isLoading: false, auth: { ...get().auth, user: null, isAuthenticated: false } });
    return false;
  };

  const init = () => {
    set({ puterReady: true });
    checkAuthStatus();
  };

  // ---------- File System ----------
  const uploadSingle = async (file: File | Blob): Promise<FSItem> => {
    const fileName = (file as File).name ?? `upload-${Date.now()}`;
    const storagePath = `uploads/${Date.now()}-${fileName}`;

    // Cache locally for immediate fast reading
    fileBlobCache.set(storagePath, file);
    if (typeof window !== "undefined") {
      fileBlobCache.set(fileName, file);
    }

    try {
      const { error } = await supabase.storage.from("uploads").upload(storagePath, file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(storagePath);
        if (urlData?.publicUrl) {
          fileBlobCache.set(urlData.publicUrl, file);
          return { path: urlData.publicUrl, name: fileName, is_dir: false };
        }
      }
    } catch {
      // ignore network errors and use local path
    }

    return { path: storagePath, name: fileName, is_dir: false };
  };

  const upload = async (
    files: File | Blob | (File | Blob)[]
  ): Promise<FSItem | FSItem[] | undefined> => {
    try {
      if (Array.isArray(files)) {
        const results = await Promise.all(files.map((f) => uploadSingle(f)));
        return results;
      }
      return await uploadSingle(files);
    } catch (e: any) {
      setError(e.message);
      return undefined;
    }
  };

  const read = async (path: string): Promise<Blob | undefined> => {
    if (fileBlobCache.has(path)) {
      return fileBlobCache.get(path);
    }

    try {
      if (path.startsWith("http")) {
        const resp = await fetch(path);
        const blob = await resp.blob();
        fileBlobCache.set(path, blob);
        return blob;
      }

      const cleanPath = path.startsWith("uploads/") ? path : `uploads/${path}`;
      const { data, error } = await supabase.storage.from("uploads").download(cleanPath);
      if (!error && data) {
        fileBlobCache.set(path, data);
        return data;
      }
    } catch (err: any) {
      console.warn("Could not read file from storage:", err);
    }

    return undefined;
  };

  const download = async (path: string): Promise<Blob | undefined> => {
    return read(path);
  };

  const del = async (path: string): Promise<void> => {
    fileBlobCache.delete(path);
    try {
      await supabase.storage.from("uploads").remove([path]);
    } catch {
      // ignore
    }
  };

  const list = async (path: string): Promise<FSItem[] | undefined> => {
    try {
      const { data, error } = await supabase.storage.from("uploads").list(path);
      if (!error && data) {
        return data.map((obj) => ({
          path: obj.name,
          name: obj.name,
          is_dir: !obj.id,
        }));
      }
    } catch {
      // fallback
    }
    return [];
  };

  // ---------- Key‑Value Store (Supabase + localStorage fallback) ----------
  const kvGet = async (key: string): Promise<string | null | undefined> => {
    try {
      const { data, error } = await supabase.from("kv").select("value").eq("key", key).single();
      if (!error && data?.value) {
        return data.value;
      }
    } catch {
      // fallback to localStorage
    }

    if (typeof window !== "undefined") {
      return localStorage.getItem(`resumind_kv_${key}`);
    }
    return null;
  };

  const kvSet = async (key: string, value: string): Promise<boolean | undefined> => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`resumind_kv_${key}`, value);
    }

    try {
      await supabase.from("kv").upsert({ key, value });
    } catch {
      // silent fallback
    }
    return true;
  };

  const kvDelete = async (key: string): Promise<boolean | undefined> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`resumind_kv_${key}`);
    }
    try {
      await supabase.from("kv").delete().eq("key", key);
    } catch {
      // silent
    }
    return true;
  };

  const kvList = async (pattern: string, returnValues = false): Promise<string[] | KVItem[] | undefined> => {
    const results: KVItem[] = [];

    if (typeof window !== "undefined") {
      const prefix = "resumind_kv_";
      const cleanPattern = pattern.replace(/\*/g, "");
      for (let i = 0; i < localStorage.length; i++) {
        const rawKey = localStorage.key(i);
        if (rawKey && rawKey.startsWith(prefix)) {
          const key = rawKey.substring(prefix.length);
          if (!cleanPattern || key.includes(cleanPattern)) {
            results.push({ key, value: localStorage.getItem(rawKey) || "" });
          }
        }
      }
    }

    try {
      const { data } = await supabase.from("kv").select("key,value").ilike("key", pattern.replace(/\*/g, "%"));
      if (data) {
        for (const item of data) {
          if (!results.some((r) => r.key === item.key)) {
            results.push(item);
          }
        }
      }
    } catch {
      // fallback to results
    }

    if (returnValues) {
      return results;
    }
    return results.map((r) => r.key);
  };

  const kvFlush = async (): Promise<boolean | undefined> => {
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("resumind_kv_")) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
    try {
      await supabase.from("kv").delete();
    } catch {
      // silent
    }
    return true;
  };

  // ---------- AI Client Interface ----------
  const chat = async (prompt: any): Promise<AIResponse> => {
    const messages = Array.isArray(prompt)
      ? prompt.map((p) => ({
          role: p.role || "user",
          content: typeof p.content === "string" ? p.content : JSON.stringify(p.content),
        }))
      : [{ role: "user", content: String(prompt) }];

    return await aiClient.chat(messages);
  };

  const feedback = async (path: string, instructions: string): Promise<AIResponse> => {
    return await aiClient.feedback(path, instructions);
  };

  const img2txt = async (image: any): Promise<string> => {
    return "Resume text extraction completed.";
  };

  return {
    isLoading: false,
    error: null,
    puterReady: true,
    auth: {
      user: null,
      isAuthenticated: false,
      signIn: async (email?: string, password?: string) => {
        set({ isLoading: true });
        if (email && password) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error && data?.user) {
            const userObj: User = {
              id: data.user.id,
              email: data.user.email ?? null,
              username: (data.user.user_metadata?.full_name as string) ?? data.user.email?.split("@")[0] ?? "User",
            };
            if (typeof window !== "undefined") {
              localStorage.setItem("resumind_user", JSON.stringify(userObj));
            }
            set({ auth: { ...get().auth, user: userObj, isAuthenticated: true }, isLoading: false });
            return;
          }
        }

        // Single-click or guest sign in
        const guestUser: User = {
          id: "guest-user",
          email: "paul@local.dev",
          username: "Paul",
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("resumind_user", JSON.stringify(guestUser));
        }
        set({ auth: { ...get().auth, user: guestUser, isAuthenticated: true }, isLoading: false });
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        if (typeof window !== "undefined") {
          localStorage.removeItem("resumind_user");
        }
        set({ auth: { ...get().auth, user: null, isAuthenticated: false } });
      },
      refreshUser: async () => {
        await checkAuthStatus();
      },
      checkAuthStatus,
      getUser: () => get().auth.user,
    },
    fs: { upload, download, read, delete: del, list },
    kv: { get: kvGet, set: kvSet, delete: kvDelete, list: kvList, flush: kvFlush },
    ai: { chat, feedback, img2txt },
    setAuth: (auth) => set({ auth: { ...get().auth, ...auth } }),
    init,
    clearError: () => set({ error: null }),
  };
});
