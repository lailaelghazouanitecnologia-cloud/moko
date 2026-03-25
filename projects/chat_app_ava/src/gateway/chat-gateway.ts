type ClientId = string & { readonly __brand: 'ClientId' };
type RoomId = string & { readonly __brand: 'RoomId' };
type UserId = string & { readonly __brand: 'UserId' };

interface ChatCommand {
  type: 'join' | 'leave' | 'message' | 'list';
  payload: unknown;
}

interface JoinPayload {
  roomId: RoomId;
  userId: UserId;
}

interface LeavePayload {
  roomId: RoomId;
  userId: UserId;
}

interface MessagePayload {
  roomId: RoomId;
  userId: UserId;
  content: string;
}

interface ListPayload {
  roomId: RoomId;
}

type CommandResult = { kind: 'ok'; data?: unknown } | { kind: 'error'; error: string };

export class ChatGateway {
  private readonly wsHandler: WebSocketHandler;
  private readonly userRepository: UserRepository;
  private readonly roomRepository: RoomRepository;
  private readonly messageRepository: MessageRepository;
  private readonly presenceService: PresenceService;
  private readonly presenceTracker: PresenceTracker;
  private readonly clientToUser: Map<ClientId, UserId>;

  constructor(
    wsHandler: WebSocketHandler,
    userRepository: UserRepository,
    roomRepository: RoomRepository,
    messageRepository: MessageRepository,
    presenceService: PresenceService,
    presenceTracker: PresenceTracker
  ) {
    this.wsHandler = wsHandler;
    this.userRepository = userRepository;
    this.roomRepository = roomRepository;
    this.messageRepository = messageRepository;
    this.presenceService = presenceService;
    this.presenceTracker = presenceTracker;
    this.clientToUser = new Map<ClientId, UserId>();
  }

  public handleConnection(ws: WebSocket, clientId: ClientId): void {
    this.wsHandler.handleConnection(ws, clientId);
    ws.onmessage = (event: MessageEvent) => this.handleMessage(clientId, event.data as string);
  }

  public handleDisconnection(clientId: ClientId): void {
    const userId = this.clientToUser.get(clientId);
    if (userId) {
      this.presenceTracker.getUserPresence(userId).forEach(entry => {
        if (entry.roomId) {
          this.presenceService.leaveRoom(userId, entry.roomId);
        }
      });
      this.clientToUser.delete(clientId);
    }
    this.wsHandler.handleDisconnection(clientId);
  }

  private handleMessage(clientId: ClientId, data: string): void {
    try {
      const command = JSON.parse(data) as ChatCommand;
      const result = this.processCommand(clientId, command);
      this.sendToClient(clientId, JSON.stringify(result));
    } catch (error) {
      this.sendToClient(clientId, JSON.stringify({
        kind: 'error',
        error: 'Invalid message format'
      }));
    }
  }

  private processCommand(clientId: ClientId, command: ChatCommand): CommandResult {
    switch (command.type) {
      case 'join':
        return this.handleJoin(clientId, command.payload as JoinPayload);
      case 'leave':
        return this.handleLeave(clientId, command.payload as LeavePayload);
      case 'message':
        return this.handleMessageCommand(clientId, command.payload as MessagePayload);
      case 'list':
        return this.handleList(clientId, command.payload as ListPayload);
      default:
        return { kind: 'error', error: 'Unknown command type' };
    }
  }

  private handleJoin(clientId: ClientId, payload: JoinPayload): CommandResult {
    const user = this.userRepository.find(payload.userId);
    if (!user) {
      return { kind: 'error', error: 'User not found' };
    }

    const room = this.roomRepository.find(payload.roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    if (room.getParticipantCount() >= room.getMaxParticipants()) {
      return { kind: 'error', error: 'Room is full' };
    }

    this.clientToUser.set(clientId, payload.userId);
    this.presenceService.joinRoom(payload.userId, payload.roomId);

    const participants = this.presenceService.getRoomParticipants(payload.roomId);
    this.broadcastToRoom(payload.roomId, JSON.stringify({
      type: 'userJoined',
      userId: payload.userId,
      participants: Array.from(participants.values()).map(u => ({
        id: u.getId(),
        username: u.getUsername()
      }))
    }));

    return { kind: 'ok' };
  }

  private handleLeave(clientId: ClientId, payload: LeavePayload): CommandResult {
    const userId = this.clientToUser.get(clientId);
    if (!userId || userId !== payload.userId) {
      return { kind: 'error', error: 'Unauthorized' };
    }

    const room = this.roomRepository.find(payload.roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    this.presenceService.leaveRoom(payload.userId, payload.roomId);

    const participants = this.presenceService.getRoomParticipants(payload.roomId);
    this.broadcastToRoom(payload.roomId, JSON.stringify({
      type: 'userLeft',
      userId: payload.userId,
      participants: Array.from(participants.values()).map(u => ({
        id: u.getId(),
        username: u.getUsername()
      }))
    }));

    return { kind: 'ok' };
  }

  private handleMessageCommand(clientId: ClientId, payload: MessagePayload): CommandResult {
    const userId = this.clientToUser.get(clientId);
    if (!userId || userId !== payload.userId) {
      return { kind: 'error', error: 'Unauthorized' };
    }

    const user = this.userRepository.find(payload.userId);
    const room = this.roomRepository.find(payload.roomId);
    if (!user || !room) {
      return { kind: 'error', error: 'Invalid user or room' };
    }

    if (!this.presenceService.isUserInRoom(payload.userId, payload.roomId)) {
      return { kind: 'error', error: 'User not in room' };
    }

    const message = new Message(
      payload.content,
      user,
      room,
      new Date()
    );

    this.messageRepository.save(message);

    this.broadcastToRoom(payload.roomId, JSON.stringify({
      type: 'message',
      message: {
        id: message.getId(),
        content: message.getContent(),
        sender: {
          id: user.getId(),
          username: user.getUsername()
        },
        createdAt: message.getCreatedAt()
      }
    }));

    return { kind: 'ok' };
  }

  private handleList(clientId: ClientId, payload: ListPayload): CommandResult {
    const userId = this.clientToUser.get(clientId);
    if (!userId) {
      return { kind: 'error', error: 'Not authenticated' };
    }

    const room = this.roomRepository.find(payload.roomId);
    if (!room) {
      return { kind: 'error', error: 'Room not found' };
    }

    const messages = this.messageRepository.findByRoom(payload.roomId);
    const participants = this.presenceService.getRoomParticipants(payload.roomId);

    return {
      kind: 'ok',
      data: {
        messages: messages.map(m => ({
          id: m.getId(),
          content: m.getContent(),
          sender: {
            id: m.getSender().getId(),
            username: m.getSender().getUsername()
          },
          createdAt: m.getCreatedAt()
        })),
        participants: Array.from(participants.values()).map(u => ({
          id: u.getId(),
          username: u.getUsername()
        }))
      }
    };
  }

  private sendToClient(clientId: ClientId, message: string): boolean {
    return this.wsHandler.sendToClient(clientId, message);
  }

  private broadcastToRoom(roomId: RoomId, message: string): void {
    const participants = this.presenceService.getRoomParticipants(roomId);
    participants.forEach(user => {
      this.clientToUser.forEach((userId, clientId) => {
        if (user.getId() === userId) {
          this.sendToClient(clientId, message);
        }
      });
    });
  }

  public broadcast(message: string): void {
    this.wsHandler.broadcast(message);
  }

  public teardown(): void {
    this.wsHandler.teardown();
    this.clientToUser.clear();
  }
}
