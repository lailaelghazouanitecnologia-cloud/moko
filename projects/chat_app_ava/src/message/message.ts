export type MessageId = string & { readonly __brand: 'MessageId' };

export class Message {
  private readonly id: MessageId;
  private readonly content: string;
  private readonly sender: User;
  private readonly room: Room;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  constructor(
    id: MessageId,
    content: string,
    sender: User,
    room: Room,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    if (!id) throw new TypeError('id is required');
    if (typeof content !== 'string') throw new TypeError('content must be a string');
    if (!sender) throw new TypeError('sender is required');
    if (!room) throw new TypeError('room is required');
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      throw new RangeError('createdAt must be a valid Date');
    }
    if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) {
      throw new RangeError('updatedAt must be a valid Date');
    }

    this.id = id;
    this.content = content;
    this.sender = sender;
    this.room = room;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Returns the unique identifier of this message.
   */
  getId(): MessageId {
    return this.id;
  }

  /**
   * Returns the text content of this message.
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Returns the user who sent this message.
   */
  getSender(): User {
    return this.sender;
  }

  /**
   * Returns the room in which this message was sent.
   */
  getRoom(): Room {
    return this.room;
  }

  /**
   * Returns the creation timestamp of this message.
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Returns the last update timestamp of this message.
   */
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Creates a new Message instance with updated content and timestamp.
   * @param newContent - The new text content for the message.
   * @throws {TypeError} If newContent is not a string.
   */
  updateContent(newContent: string): Message {
    if (typeof newContent !== 'string') throw new TypeError('newContent must be a string');
    return new Message(
      this.id,
      newContent,
      this.sender,
      this.room,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Checks whether this message was sent by the given user.
   * @param user - The user to compare against.
   * @throws {TypeError} If user is not provided.
   */
  isFromUser(user: User): boolean {
    if (!user) throw new TypeError('user is required');
    return this.sender.getId() === user.getId();
  }

  /**
   * Checks whether this message belongs to the given room.
   * @param room - The room to compare against.
   * @throws {TypeError} If room is not provided.
   */
  isInRoom(room: Room): boolean {
    if (!room) throw new TypeError('room is required');
    return this.room.getId() === room.getId();
  }

  /**
   * Serializes this message to a JSON-compatible representation.
   * @returns An object suitable for JSON.stringify.
   */
  toJSON(): unknown {
    return {
      id: this.id,
      content: this.content,
      sender: this.sender.getId(),
      room: this.room.getId(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
