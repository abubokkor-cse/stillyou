import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mutate, read } from "../src/server/store";
import {
  digest,
  publicWorkspace,
  updateChecklist,
} from "../src/server/workspace";
import { sharedWorkspace } from "../src/server/sharing";
import type { Workspace } from "../src/lib/types";

const keys: string[] = [];
beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("VERCEL", "");
});
afterEach(async () => {
  for (const key of keys.splice(0)) await mutate(key, () => null);
  vi.unstubAllEnvs();
});
const key = (value: string) => {
  keys.push(value);
  return value;
};

function workspace(id: string): Workspace {
  return {
    id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    photos: [
      {
        id: "source",
        storageKey: "private/source.jpg",
        takenOn: "2026-01-01",
        savedAt: "2026-01-01",
      },
    ],
    choices: [
      {
        id: "wig",
        name: "Test reference",
        kind: "hair",
        reference: {
          id: "reference",
          storageKey: "private/wig.jpg",
          takenOn: "2026-01-01",
          savedAt: "2026-01-01",
        },
      },
    ],
    previews: [
      {
        id: "preview",
        kind: "hair",
        sourceId: "source",
        sourceDate: "2026-01-01",
        state: "success",
        taskId: "provider-task",
        resultKey: "private/result.jpg",
        createdAt: "2026-01-01",
      },
    ],
    shortlist: ["preview"],
    checklists: {},
  };
}

describe("private workspace persistence", () => {
  it("keeps purchase checks separate for different products", () => {
    const original = workspace("owner");
    original.previews[0].choiceId = "first-wig";
    original.previews.push({
      ...original.previews[0],
      id: "second-preview",
      choiceId: "second-wig",
    });
    const updated = updateChecklist(original, "preview", "policy", true);
    expect(updated.checklists["first-wig"].policy).toBe(true);
    expect(updated.checklists["second-wig"]).toBeUndefined();
    expect(() =>
      updateChecklist(updated, "someone-elses-preview", "policy", true),
    ).toThrow("not found");
  });
  it("keeps simultaneous votes or edits without losing writes", async () => {
    const id = key(`test:${randomUUID()}`);
    await Promise.all(
      Array.from({ length: 25 }, () =>
        mutate<number>(id, (count) => (count ?? 0) + 1),
      ),
    );
    expect(await read(id)).toBe(25);
  });

  it("strips private storage locations and provider task IDs from browser data", () => {
    const value = JSON.stringify(publicWorkspace(workspace("owner")));
    expect(value).not.toContain("private/");
    expect(value).not.toContain("provider-task");
    expect(value).toContain("2026-01-01");
  });

  it("checks the current link on every request so old and revoked links fail", async () => {
    const secret = "a".repeat(43);
    const owner = randomUUID();
    const shareKey = key(`share:${digest(secret)}`);
    const ownerKey = key(`workspace:${owner}`);
    await mutate(shareKey, () => ({ workspaceId: owner }));
    await mutate<Workspace>(ownerKey, () => ({
      ...workspace(owner),
      share: {
        token: secret,
        previewIds: ["preview"],
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    }));
    expect((await sharedWorkspace(secret)).id).toBe(owner);
    await mutate<Workspace>(ownerKey, (current) => ({
      ...current!,
      share: { ...current!.share!, token: "b".repeat(43) },
    }));
    await expect(sharedWorkspace(secret)).rejects.toThrow("no longer shared");
    await mutate(shareKey, () => null);
    await expect(sharedWorkspace(secret)).rejects.toThrow("no longer shared");
  });

  it("refuses expired sharing even when photos still await cleanup", async () => {
    const secret = "c".repeat(43);
    const owner = randomUUID();
    await mutate(key(`share:${digest(secret)}`), () => ({
      workspaceId: owner,
    }));
    await mutate<Workspace>(key(`workspace:${owner}`), () => ({
      ...workspace(owner),
      share: {
        token: secret,
        previewIds: ["preview"],
        expiresAt: "2020-01-01T00:00:00.000Z",
      },
    }));
    await expect(sharedWorkspace(secret)).rejects.toThrow("no longer shared");
  });
});
