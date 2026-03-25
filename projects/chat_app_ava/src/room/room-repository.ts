type RoomId = string & { readonly __brand: 'RoomId' };

type CreateRoom = {
  name: string;
  createdBy: User;
  maxParticipants: number;
}

type FindRoom = {
  id: RoomId;
}

type FindRoomsByCreator = {
  createdBy: User;
}

type AddParticipant = {
  roomId: RoomId;
  participant: User;
}

type RemoveParticipant = {
  roomId: RoomId;
  participant: User;
}

type DeleteRoom = {
  roomId: RoomId;
}

type Result<T> = { kind: 'ok'; value: T } | { kind: 'error'; error: string };

export class RoomRepository {
  private readonly rooms: Map<RoomId, Room>;

  constructor() {
    this.rooms = new Map<RoomId, Room>();
  }

  /**
   * Creates a new room and stores it in the repository.
   * @param createRoom - The room creation parameters.
   * @returns A result containing the created room or an error message.
   */
  create(createRoom: CreateRoom): Result<Room> {
    if (!createRoom.name || typeof createRoom.name !== 'string') {
      return { kind: 'error', error: 'Invalid room name' };
    }
    if (!createRoom.createdBy) {
      return { kind: 'error', error: 'Invalid creator' };
    }
    if (typeof createRoom.maxParticipants !== 'number' || createRoom.maxParticipants <= 0) {
      return { kind: 'error', error: 'Invalid max participants count' };
    }

    const roomId = this.generateRoomId();
    const room = new Room(roomId, {
      name: createRoom.name,
      createdBy: createRoom.createdBy,
      maxParticipants: createRoom.maxParticipants
    });

    this.rooms.set(roomId, room);
    return { kind: 'ok', value: room };
  }

  /**
   * Finds a room by its ID.
   * @param findRoom - The room search parameters.
   * @returns A result containing the room or an error message if not found.
   */
  find(findRoom: FindRoom): Result<Room> {
    if (!findRoom.id) {
      return { kind: 'error', error: 'Invalid room ID' };
    }
    const room = this.rooms.get(findRoom.id);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }
    return { kind: 'ok', value: room };
  }

  /**
   * Retrieves all rooms in the repository.
   * @returns A readonly array of all rooms.
   */
  findAll(): ReadonlyArray<Room> {
    return Array.from(this.rooms.values());
  }

  /**
   * Finds all rooms created by a specific user.
   * @param findRoomsByCreator - The creator to filter by.
   * @returns A readonly array of rooms created by the specified user.
   */
  findByCreator(findRoomsByCreator: FindRoomsByCreator): ReadonlyArray<Room> {
    if (!findRoomsByCreator.createdBy) {
      return [];
    }
    return Array.from(this.rooms.values()).filter(room => room.getCreatedBy().getId() === findRoomsByCreator.createdBy.getId());
  }

  /**
   * Saves a room to the repository.
   * @param room - The room to save.
   * @returns A result containing the saved room or an error message.
   */
  save(room: Room): Result<Room> {
      try {
        if (!room) {
          return { kind: 'error', error: 'Invalid room' };
        }
        this.rooms.set(room.getId(), room);
        return { kind: 'ok', value: room };
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to save: ${message}`);
      }
  }

  /**
   * Deletes a room from the repository.
   * @param room - The room to delete.
   * @returns A result indicating success or an error message.
   */
  delete(room: Room): Result<void> {
    if (!room) {
      return { kind: 'error', error: 'Invalid room' };
    }
    this.rooms.delete(room.getId());
    return { kind: 'ok', value: undefined };
  }

  /**
   * Adds a participant to a room.
   * @param addParticipant - The participant addition parameters.
   * @returns A result containing the updated room or an error message.
   */
  addParticipant(addParticipant: AddParticipant): Result<Room> {
    if (!addParticipant.roomId) {
      return { kind: 'error', error: 'Invalid room ID' };
    }
    if (!addParticipant.participant) {
      return { kind: 'error', error: 'Invalid participant' };
    }

    const room = this.rooms.get(addParticipant.roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    if (room.getParticipantCount() >= room.getMaxParticipants()) {
      return { kind: 'error', error: 'Room is full' };
    }

    const participants = room.participants;
    if (participants.has(addParticipant.participant.getId())) {
      return { kind: 'error', error: 'Participant already in room' };
    }

    participants.set(addParticipant.participant.getId(), addParticipant.participant);
    return { kind: 'ok', value: room };
  }

  /**
   * Removes a participant from a room.
   * @param removeParticipant - The participant removal parameters.
   * @returns A result containing the updated room or an error message.
   */
  removeParticipant(removeParticipant: RemoveParticipant): Result<Room> {
    if (!removeParticipant.roomId) {
      return { kind: 'error', error: 'Invalid room ID' };
    }
    if (!removeParticipant.participant) {
      return { kind: 'error', error: 'Invalid participant' };
    }

    const room = this.rooms.get(removeParticipant.roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    const participants = room.participants;
    if (!participants.has(removeParticipant.participant.getId())) {
      return { kind: 'error', error: 'Participant not in room' };
    }

    participants.delete(removeParticipant.participant.getId());
    return { kind: 'ok', value: room };
  }

  /**
   * Deletes a room by its ID.
   * @param deleteRoom - The room deletion parameters.
   * @returns A result indicating success or an error message.
   */
  deleteById(deleteRoom: DeleteRoom): Result<void> {
    if (!deleteRoom.roomId) {
      return { kind: 'error', error: 'Invalid room ID' };
    }
    const existed = this.rooms.delete(deleteRoom.roomId);
    if (!existed) {
      return { kind: 'error', error: 'Room not found' };
    }
    return { kind: 'ok', value: undefined };
  }

  private generateRoomId(): RoomId {
    return (Date.now() + Math.random()).toString(36) as RoomId;
  }
}
