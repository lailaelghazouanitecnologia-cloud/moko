import { Node } from './node';
import { Edge } from './edge';

/**
 * Stores and links extracted facts as a graph.
 */
export class KnowledgeGraph {
    private nodes: Map<string, Node>;
    private edges: Map<string, Edge>;
    private nextId: number;

    constructor() {
        this.nodes = new Map<string, Node>();
        this.edges = new Map<string, Edge>();
        this.nextId = 1;
    }

    /**
     * Insert a node into the graph and return its ID.
     * @param node The node to add
     * @returns The ID of the added node
     * @throws {TypeError} If node is not an instance of Node
     * @throws {Error} If a node with the same ID already exists
     */
    addNode(node: Node): string {
        if (!(node instanceof Node)) {
            throw new TypeError('Expected node to be an instance of Node');
        }

        const id = node.getId();
        if (this.nodes.has(id)) {
            throw new Error(`Node with ID "${id}" already exists`);
        }

        this.nodes.set(id, node);
        return id;
    }

    /**
     * Insert an edge into the graph and return its ID.
     * @param edge The edge to add
     * @returns The ID of the added edge
     * @throws {TypeError} If edge is not an instance of Edge
     * @throws {Error} If an edge with the same ID already exists
     * @throws {Error} If source or target node does not exist in the graph
     */
    addEdge(edge: Edge): string {
        if (!(edge instanceof Edge)) {
            throw new TypeError('Expected edge to be an instance of Edge');
        }

        const id = edge.getId();
        if (this.edges.has(id)) {
            throw new Error(`Edge with ID "${id}" already exists`);
        }

        const sourceId = edge.getSourceId();
        const targetId = edge.getTargetId();

        if (!this.nodes.has(sourceId)) {
            throw new Error(`Source node with ID "${sourceId}" does not exist`);
        }

        if (!this.nodes.has(targetId)) {
            throw new Error(`Target node with ID "${targetId}" does not exist`);
        }

        this.edges.set(id, edge);
        return id;
    }

    /**
     * Retrieve a node by its ID.
     * @param id The ID of the node to retrieve
     * @returns The node if found, otherwise undefined
     * @throws {TypeError} If id is not a non-empty string
     */
    getNode(id: string): Node | undefined {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new TypeError('Expected id to be a non-empty string');
        }
        return this.nodes.get(id);
    }

    /**
     * Retrieve an edge by its ID.
     * @param id The ID of the edge to retrieve
     * @returns The edge if found, otherwise undefined
     * @throws {TypeError} If id is not a non-empty string
     */
    getEdge(id: string): Edge | undefined {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new TypeError('Expected id to be a non-empty string');
        }
        return this.edges.get(id);
    }

    /**
     * Remove a node and all its incident edges from the graph.
     * @param id The ID of the node to remove
     * @returns true if the node was removed, false if it did not exist
     * @throws {TypeError} If id is not a non-empty string
     */
    removeNode(id: string): boolean {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new TypeError('Expected id to be a non-empty string');
        }

        if (!this.nodes.has(id)) {
            return false;
        }

        const edgesToRemove: string[] = [];
        for (const [edgeId, edge] of this.edges) {
            if (edge.getSourceId() === id || edge.getTargetId() === id) {
                edgesToRemove.push(edgeId);
            }
        }

        for (const edgeId of edgesToRemove) {
            this.edges.delete(edgeId);
        }

        return this.nodes.delete(id);
    }

    /**
     * Remove an edge from the graph.
     * @param id The ID of the edge to remove
     * @returns true if the edge was removed, false if it did not exist
     * @throws {TypeError} If id is not a non-empty string
     */
    removeEdge(id: string): boolean {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new TypeError('Expected id to be a non-empty string');
        }
        return this.edges.delete(id);
    }

    /**
     * Get all adjacent nodes of a given node.
     * @param nodeId The ID of the node whose neighbors to retrieve
     * @returns An array of neighboring nodes
     * @throws {TypeError} If nodeId is not a non-empty string
     * @throws {Error} If the node does not exist in the graph
     */
    neighbors(nodeId: string): Node[] {
        if (typeof nodeId !== 'string' || nodeId.trim() === '') {
            throw new TypeError('Expected nodeId to be a non-empty string');
        }

        if (!this.nodes.has(nodeId)) {
            throw new Error(`Node with ID "${nodeId}" does not exist`);
        }

        const neighborNodes: Node[] = [];
        const neighborIds = new Set<string>();

        for (const edge of this.edges.values()) {
            if (edge.getSourceId() === nodeId) {
                neighborIds.add(edge.getTargetId());
            } else if (edge.getTargetId() === nodeId) {
                neighborIds.add(edge.getSourceId());
            }
        }

        for (const neighborId of neighborIds) {
            const node = this.nodes.get(neighborId);
            if (node) {
                neighborNodes.push(node);
            }
        }

        return neighborNodes;
    }

    /**
     * Export the graph to a plain object.
     * @returns A plain object representation of the graph
     */
    serialize(): object {
        const nodeData: Record<string, any> = {};
        for (const [id, node] of this.nodes) {
            nodeData[id] = node.toJSON();
        }

        const edgeData: Record<string, any> = {};
        for (const [id, edge] of this.edges) {
            edgeData[id] = {
                id: edge.getId(),
                sourceId: edge.getSourceId(),
                targetId: edge.getTargetId(),
                label: edge.getLabel(),
                weight: edge.getWeight(),
                metadata: edge.getMetadata()
            };
        }

        return {
            nodes: nodeData,
            edges: edgeData,
            nextId: this.nextId
        };
    }

    /**
     * Import the graph from a plain object.
     * @param data The plain object to import from
     * @throws {TypeError} If data is not a plain object
     * @throws {Error} If required fields are missing or invalid
     */
    deserialize(data: object): void {
        if (!data || typeof data !== 'object') {
            throw new TypeError('Expected data to be a plain object');
        }

        const obj = data as any;

        this.nodes.clear();
        this.edges.clear();

        if (obj.nodes) {
            if (typeof obj.nodes !== 'object') {
                throw new Error('Invalid nodes data: expected object');
            }
            for (const [id, nodeData] of Object.entries(obj.nodes)) {
                if (typeof nodeData !== 'object' || nodeData === null) {
                    throw new Error(`Invalid node data for ID "${id}"`);
                }
                const node = new Node(id, (nodeData as any).label || '');
                if ((nodeData as any).properties && typeof (nodeData as any).properties === 'object') {
                    for (const [key, value] of Object.entries((nodeData as any).properties)) {
                        node.setProperty(key, value);
                    }
                }
                this.nodes.set(id, node);
            }
        }

        if (obj.edges) {
            if (typeof obj.edges !== 'object') {
                throw new Error('Invalid edges data: expected object');
            }
            for (const [id, edgeData] of Object.entries(obj.edges)) {
                if (typeof edgeData !== 'object' || edgeData === null) {
                    throw new Error(`Invalid edge data for ID "${id}"`);
                }
                const edge = new Edge(
                    (edgeData as any).id,
                    (edgeData as any).sourceId,
                    (edgeData as any).targetId,
                    (edgeData as any).label,
                    (edgeData as any).weight || 1
                );
                if ((edgeData as any).metadata && typeof (edgeData as any).metadata === 'object') {
                    for (const [key, value] of Object.entries((edgeData as any).metadata)) {
                        edge.setMetadata(key, value);
                    }
                }
                this.edges.set(id, edge);
            }
        }

        if (typeof obj.nextId === 'number' && obj.nextId >= 0) {
            this.nextId = obj.nextId;
        }
    }

    /**
     * Get the next available ID for new nodes or edges.
     * @returns The next ID as a string
     */
    private getNextId(): string {
        return String(this.nextId++);
    }

    /**
     * Check if a node exists in the graph.
     * @param id The ID of the node to check
     * @returns true if the node exists, false otherwise
     */
    hasNode(id: string): boolean {
        if (typeof id !== 'string' || id.trim() === '') {
            return false;
        }
        return this.nodes.has(id);
    }

    /**
     * Check if an edge exists in the graph.
     * @param id The ID of the edge to check
     * @returns true if the edge exists, false otherwise
     */
    hasEdge(id: string): boolean {
        if (typeof id !== 'string' || id.trim() === '') {
            return false;
        }
        return this.edges.has(id);
    }

    /**
     * Get all node IDs in the graph.
     * @returns An array of node IDs
     */
    getNodeIds(): string[] {
        return Array.from(this.nodes.keys());
    }

    /**
     * Get all edge IDs in the graph.
     * @returns An array of edge IDs
     */
    getEdgeIds(): string[] {
        return Array.from(this.edges.keys());
    }

    /**
     * Get the number of nodes in the graph.
     * @returns The node count
     */
    getNodeCount(): number {
        return this.nodes.size;
    }

    /**
     * Get the number of edges in the graph.
     * @returns The edge count
     */
    getEdgeCount(): number {
        return this.edges.size;
    }

    /**
     * Clear all nodes and edges from the graph.
     */
    clear(): void {
        this.nodes.clear();
        this.edges.clear();
        this.nextId = 1;
    }
}
