type UserId = string & { readonly __brand: 'UserId' };
type RoomId = string & { readonly __brand: 'RoomId' };

type PresenceStatus = 'online' | 'offline' | 'away';

interface PresenceEntry {
  readonly userId: UserId;
  readonly roomId: RoomId | null;
  readonly status: PresenceStatus;
  readonly lastSeen: Date;
}

type PresenceUpdateResult = 
  | { kind: 'ok'; entry: PresenceEntry }
  | { kind: 'error'; error: string };

type PresenceQueryResult = 
  | { kind: 'ok'; entry: PresenceEntry }
  | { kind: 'error'; error: string };

type RoomPresenceResult = 
  | { kind: 'ok'; entries: ReadonlyArray<PresenceEntry> }
  | { kind: 'error'; error: string };

export class PresenceTracker {
  private readonly presenceService: PresenceService;
  private readonly presenceMap: Map<UserId, PresenceEntry>;

  constructor(presenceService: PresenceService) {
    this.presenceService = presenceService;
    this.presenceMap = new Map<UserId, PresenceEntry>();
  }

  trackUserPresence(userId: UserId, status: PresenceStatus): PresenceUpdateResult {
    const existingEntry = this.presenceMap.get(userId);
    const newEntry: PresenceEntry = {
      userId,
      roomId: existingEntry?.roomId ?? null,
      status,
      lastSeen: new Date()
    };

    this.presenceMap.set(userId, newEntry);
    return { kind: 'ok', entry: newEntry };
  }

  updateUserRoom(userId: UserId, roomId: RoomId | null): PresenceUpdateResult {
    const existingEntry = this.presenceMap.get(userId);
    if (!existingEntry) {
      return { kind: 'error', error: 'User presence not found' };
    }

    const updatedEntry: PresenceEntry = {
      ...existingEntry,
      roomId,
      lastSeen: new Date()
    };

    this.presenceMap.set(userId, updatedEntry);
    return { kind: 'ok', entry: updatedEntry };
  }

  getUserPresence(userId: UserId): PresenceQueryResult {
    const entry = this.presenceMap.get(userId);
    if (!entry) {
      return { kind: 'error', error: 'User presence not found' };
    }
    return { kind: 'ok', entry };
  }

  getRoomPresence(roomId: RoomId): RoomPresenceResult {
    const entries: PresenceEntry[] = [];
    for (const entry of this.presenceMap.values()) {
      if (entry.roomId === roomId) {
        entries.push(entry);
      }
    }
    return { kind: 'ok', entries };
  }

  getOnlineUsers(): ReadonlyArray<UserId> {
    const onlineUsers: UserId[] = [];
    for (const entry of this.presenceMap.values()) {
      if (entry.status === 'online') {
        onlineUsers.push(entry.userId);
      }
    }
    return onlineUsers;
  }

  getAwayUsers(): ReadonlyArray<UserId> {
    const awayUsers: UserId[] = [];
    for (const entry of this.presenceMap.values()) {
      if (entry.status === 'away') {
        awayUsers.push(entry.userId);
      }
    }
    return awayUsers;
  }

  removeUserPresence(userId: UserId): boolean {
    return this.presenceMap.delete(userId);
  }

  clearRoomPresence(roomId: RoomId): number {
    let clearedCount = 0;
    for (const [userId, entry] of this.presenceMap.entries()) {
      if (entry.roomId === roomId) {
        const updatedEntry: PresenceEntry = {
          ...entry,
          roomId: null,
          lastSeen: new Date()
        };
        this.presenceMap.set(userId, updatedEntry);
        clearedCount++;
      }
    }
    return clearedCount;
  }

  getTotalOnlineCount(): number {
    let count = 0;
    for (const entry of this.presenceMap.values()) {
      if (entry.status === 'online') {
        count++;
      }
    }
    return count;
  }

  getRoomOnlineCount(roomId: RoomId): number {
    let count = 0;
    for (const entry of this.presenceMap.values()) {
      if (entry.roomId === roomId && entry.status === 'online') {
        count++;
      }
    }
    return count;
  }

  isUserOnline(userId: UserId): boolean {
    const entry = this.presenceMap.get(userId);
    return entry?.status === 'online';
  }

  isUserInRoom(userId: UserId, roomId: RoomId): boolean {
    const entry = this.presenceMap.get(userId);
    return entry?.roomId === roomId;
  }

  getPresenceService(): PresenceService {
    return this.presenceService;
  }
}
