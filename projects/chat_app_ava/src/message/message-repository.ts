import { Message } from './message';
import { MessageId } from './message';
import { Room } from '../room/room';
import { User } from '../user/user';

/**
 * Repository for managing Message entities in memory.
 * Provides CRUD operations and various query methods for messages.
 */
export class MessageRepository {
  private readonly messages: Map<MessageId, Message>;

  constructor() {
    this.messages = new Map<MessageId, Message>();
  }

  /**
   * Saves a message to the repository.
   * @param message - The message to save
   * @throws {TypeError} If message is not a valid Message instance
   */
  save(message: Message): void {
    if (!(message instanceof Message)) {
      throw new TypeError('Message must be a valid Message instance');
    }
    this.messages.set(message.getId(), message);
  }

  /**
   * Finds a message by its ID.
   * @param id - The message ID to search for
   * @returns The message if found, undefined otherwise
   * @throws {TypeError} If id is not a valid MessageId
   */
  findById(id: MessageId): Message | undefined {
    if (!(id instanceof MessageId)) {
      throw new TypeError('ID must be a valid MessageId instance');
    }
    return this.messages.get(id);
  }

  /**
   * Finds all messages in a specific room.
   * @param room - The room to search in
   * @returns Array of messages in the room
   * @throws {TypeError} If room is not a valid Room instance
   */
  findByRoom(room: Room): ReadonlyArray<Message> {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      if (message.getRoom().getId().equals(room.getId())) {
        result.push(message);
      }
    }
    return result;
  }

  /**
   * Finds all messages sent by a specific user.
   * @param sender - The user who sent the messages
   * @returns Array of messages sent by the user
   * @throws {TypeError} If sender is not a valid User instance
   */
  findBySender(sender: User): ReadonlyArray<Message> {
    if (!(sender instanceof User)) {
      throw new TypeError('Sender must be a valid User instance');
    }
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      if (message.getSender().getId().equals(sender.getId())) {
        result.push(message);
      }
    }
    return result;
  }

  /**
   * Finds all messages in a room sent by a specific user.
   * @param room - The room to search in
   * @param sender - The user who sent the messages
   * @returns Array of messages matching both criteria
   * @throws {TypeError} If room or sender are not valid instances
   */
  findByRoomAndSender(room: Room, sender: User): ReadonlyArray<Message> {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    if (!(sender instanceof User)) {
      throw new TypeError('Sender must be a valid User instance');
    }
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      if (
        message.getRoom().getId().equals(room.getId()) &&
        message.getSender().getId().equals(sender.getId())
      ) {
        result.push(message);
      }
    }
    return result;
  }

  /**
   * Retrieves all messages in the repository.
   * @returns Array of all messages
   */
  findAll(): ReadonlyArray<Message> {
    return Array.from(this.messages.values());
  }

  /**
   * Deletes a message by its ID.
   * @param id - The message ID to delete
   * @returns true if the message was deleted, false if not found
   * @throws {TypeError} If id is not a valid MessageId
   */
  delete(id: MessageId): boolean {
    if (!(id instanceof MessageId)) {
      throw new TypeError('ID must be a valid MessageId instance');
    }
    return this.messages.delete(id);
  }

  /**
   * Deletes all messages in a specific room.
   * @param room - The room whose messages should be deleted
   * @returns Number of messages deleted
   * @throws {TypeError} If room is not a valid Room instance
   */
  deleteByRoom(room: Room): number {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    let deletedCount = 0;
    const messagesToDelete: MessageId[] = [];
    
    for (const [messageId, message] of this.messages.entries()) {
      if (message.getRoom().getId().equals(room.getId())) {
        messagesToDelete.push(messageId);
      }
    }
    
    for (const messageId of messagesToDelete) {
      if (this.messages.delete(messageId)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Deletes all messages sent by a specific user.
   * @param sender - The user whose messages should be deleted
   * @returns Number of messages deleted
   * @throws {TypeError} If sender is not a valid User instance
   */
  deleteBySender(sender: User): number {
    if (!(sender instanceof User)) {
      throw new TypeError('Sender must be a valid User instance');
    }
    let deletedCount = 0;
    const messagesToDelete: MessageId[] = [];
    
    for (const [messageId, message] of this.messages.entries()) {
      if (message.getSender().getId().equals(sender.getId())) {
        messagesToDelete.push(messageId);
      }
    }
    
    for (const messageId of messagesToDelete) {
      if (this.messages.delete(messageId)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Gets the total number of messages in the repository.
   * @returns The message count
   */
  count(): number {
    return this.messages.size;
  }

  /**
   * Counts messages in a specific room.
   * @param room - The room to count messages in
   * @returns Number of messages in the room
   * @throws {TypeError} If room is not a valid Room instance
   */
  countByRoom(room: Room): number {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    let count = 0;
    for (const message of this.messages.values()) {
      if (message.getRoom().getId().equals(room.getId())) {
        count++;
      }
    }
    return count;
  }

  /**
   * Counts messages sent by a specific user.
   * @param sender - The user whose messages to count
   * @returns Number of messages sent by the user
   * @throws {TypeError} If sender is not a valid User instance
   */
  countBySender(sender: User): number {
    if (!(sender instanceof User)) {
      throw new TypeError('Sender must be a valid User instance');
    }
    let count = 0;
    for (const message of this.messages.values()) {
      if (message.getSender().getId().equals(sender.getId())) {
        count++;
      }
    }
    return count;
  }

  /**
   * Checks if a message with the given ID exists.
   * @param id - The message ID to check
   * @returns true if the message exists, false otherwise
   * @throws {TypeError} If id is not a valid MessageId
   */
  exists(id: MessageId): boolean {
    if (!(id instanceof MessageId)) {
      throw new TypeError('ID must be a valid MessageId instance');
    }
    return this.messages.has(id);
  }

  /**
   * Gets the latest messages in a room.
   * @param room - The room to search in
   * @param limit - Maximum number of messages to return
   * @returns Array of the latest messages, sorted by creation time
   * @throws {TypeError} If room is not a valid Room instance
   * @throws {RangeError} If limit is less than 1
   */
  getLatestByRoom(room: Room, limit: number): ReadonlyArray<Message> {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('Limit must be a positive integer');
    }
    const roomMessages = this.findByRoom(room);
    return roomMessages
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime())
      .slice(0, limit);
  }

  /**
   * Gets the earliest messages in a room.
   * @param room - The room to search in
   * @param limit - Maximum number of messages to return
   * @returns Array of the earliest messages, sorted by creation time
   * @throws {TypeError} If room is not a valid Room instance
   * @throws {RangeError} If limit is less than 1
   */
  getEarliestByRoom(room: Room, limit: number): ReadonlyArray<Message> {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('Limit must be a positive integer');
    }
    const roomMessages = this.findByRoom(room);
    return roomMessages
      .sort((a, b) => a.getCreatedAt().getTime() - b.getCreatedAt().getTime())
      .slice(0, limit);
  }

  /**
   * Gets messages created within a specific time range.
   * @param start - Start of the time range (inclusive)
   * @param end - End of the time range (inclusive)
   * @returns Array of messages within the time range
   * @throws {TypeError} If start or end are not valid Date objects
   * @throws {RangeError} If start is after end
   */
  getMessagesInTimeRange(start: Date, end: Date): ReadonlyArray<Message> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new TypeError('Start must be a valid Date');
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      throw new TypeError('End must be a valid Date');
    }
    if (start > end) {
      throw new RangeError('Start date must be before or equal to end date');
    }
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      const createdAt = message.getCreatedAt();
      if (createdAt >= start && createdAt <= end) {
        result.push(message);
      }
    }
    return result;
  }

  /**
   * Gets messages in a specific room created within a time range.
   * @param room - The room to search in
   * @param start - Start of the time range (inclusive)
   * @param end - End of the time range (inclusive)
   * @returns Array of messages matching both criteria
   * @throws {TypeError} If room is not a valid Room instance or dates are invalid
   * @throws {RangeError} If start is after end
   */
  getMessagesInRoomTimeRange(room: Room, start: Date, end: Date): ReadonlyArray<Message> {
    if (!(room instanceof Room)) {
      throw new TypeError('Room must be a valid Room instance');
    }
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new TypeError('Start must be a valid Date');
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      throw new TypeError('End must be a valid Date');
    }
    if (start > end) {
      throw new RangeError('Start date must be before or equal to end date');
    }
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      if (
        message.getRoom().getId().equals(room.getId()) &&
        message.getCreatedAt() >= start &&
        message.getCreatedAt() <= end
      ) {
        result.push(message);
      }
    }
    return result;
  }

  /**
   * Clears all messages from the repository.
   */
  clear(): void {
    this.messages.clear();
  }
}