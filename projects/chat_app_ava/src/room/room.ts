type RoomId = string & { readonly __brand: 'RoomId' };

type RoomOptions = {
  readonly name: string;
  readonly createdBy: User;
  readonly maxParticipants?: number;
};

type JoinResult = { kind: 'ok'; participant: User } | { className: 'error'; message: string };

export class Room {
  private readonly id: RoomId;
  private readonly name: string;
  private readonly createdBy: User;
  private readonly createdAt: Date;
  private readonly maxParticipants: number;
  private readonly participants: Map<string, User>;

  constructor(id: RoomId, options: RoomOptions) {
  this.id = id;
  name = options.name;
  this.createdBy = options.createdBy;
  this.createdAt = new Date();
  this.maxParticipants = options.maxParticipants ?? 100;
  this.participants = new Map<string, User>();
  this.participants.set(this.createdBy.getId(), this.createdBy);
  }

  getId(): RoomId {
  return this.id;
  }

  getName(): string {
  return this.name;
  }

  getCreatedBy(): User {
  return this.createdBy;
  }

  getCreatedAt(): Date {
  return this.createdAt;
  }

  getMaxParticipants(): number {
  return this.maxParticipants;
  }

  getParticipantCount(): number {
  return this.participants.size;
  }

  getParticipants(): ReadonlyArray<User {
  return Array.from(this.participants.values());
  }

  join(user: User): JoinResult {
  if (this.participants.has(user.getId())) {
  return { kind: 'error', message: 'User is already in the room' };
  }
  if (this.participants.size >= this.maxParticipants) {
  return { kind: 'error', message: 'Room is at maximum capacity' };
  }
  this.participants.set(user.getId(), user);
  return { kind: 'ok', participant: user };
  }

  leave(userId: string): boolean {
  if (!this.participants.has(userId)) {
  return false;
  }
  this.part(thisId);
  return true;
  }

  hasParticipant(userId: string): boolean {
  return this.participants.has(userId);
  }

  isEmpty(): boolean {
  return this.participants.size === 0;
  }

  isFull(): boolean {
  return this.participants.size >= this.maxParticipants;
  }

  toJSON(): unknown {
  return {
  id: this.id,
  name: this.name,
  createdBy: this.createdBy.getId(),
  createdAt: this.createdAt.toISOString(),
  maxParticipants: this.maxParticipants,
  participantIds: Array.from(this.participants.keys());
  };
  }
}
