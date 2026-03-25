type UserId = string & { readonly __brand: 'UserId' };
type RoomId = string & { readonly __brand: 'RoomId' };

type JoinResult = { kind: 'ok'; room: Room } | { kind: 'error'; error: string };
type LeaveResult = { kind: 'ok'; room: Room } | { kind: 'error'; error: string };
type GetPresenceResult = { kind: 'ok'; rooms: ReadonlyArray<Room> } | { kind: 'error'; error: string };

export class PresenceService {
  private readonly userRepository: UserRepository;
  private readonly roomRepository: RoomRepository;

  constructor(userRepository: UserRepository, roomRepository: RoomRepository) {
    this.userRepository = userRepository;
    this.roomRepository = roomRepository;
  }

  joinRoom(userId: UserId, roomId: RoomId): JoinResult {
    const user = this.userRepository.find(userId);
    if (!user) {
      return { kind: 'error', error: 'User not found' };
    }

    const room = this.roomRepository.find(roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    if (room.getParticipantCount() >= room.getMaxParticipants()) {
      return { kind: 'error', error: 'Room is full' };
    }

    if (room.participants.has(userId)) {
      return { kind: 'error', error: 'User already in room' };
    }

    room.participants.set(userId, user);
    this.roomRepository.save(room);

    return { kind: 'ok', room };
  }

  leaveRoom(userId: UserId, roomId: RoomId): LeaveResult {
    const room = this.roomRepository.find(roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    if (!room.participants.has(userId)) {
      return { kind: 'error', error: 'User not in room' };
    }

    room.participants.delete(userId);
    this.roomRepository.save(room);

    return { kind: 'ok', room };
  }

  getUserPresence(userId: UserId): GetPresenceResult {
    const user = this.userRepository.find(userId);
    if (!user) {
      return { kind: 'error', error: 'User not found' };
    }

    const allRooms = this.roomRepository.findAll();
    const userRooms = allRooms.filter(room => room.participants.has(userId));

    return { kind: 'ok', rooms: userRooms };
  }

  getRoomParticipants(roomId: RoomId): ReadonlyArray<User> {
    const room = this.roomRepository.find(roomId);
    if (!room) {
      return [];
    }

    return Array.from(room.participants.values());
  }

  isUserInRoom(userId: UserId, roomId: RoomId): boolean {
    const room = this.roomRepository.find(roomId);
    if (!room) {
      return false;
    }

    return room.participants.has(userId);
  }

  broadcastToRoom(roomId: RoomId, message: unknown): void {
    const room = this.roomRepository.find(roomId);
    if (!room) {
      return;
    }

    for (const user of room.participants.values()) {
      // Broadcast implementation would go here
      // This is a placeholder for actual broadcast logic
    }
  }
}
