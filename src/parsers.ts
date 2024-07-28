import { mkdir, copyFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fileURLToPath } from "url";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { resolve, basename } from "node:path";

interface RekordboxTrackNode {
	__attributes: { TrackID: string; Location: string };
}

interface RekordboxPlaylistNode {
	__attributes: { Type: "1"; Name: string; Entries: string };
	TRACK: { __attributes: { Key: string } }[];
}

interface RekordboxFolderNode {
	__attributes: { Type: "0"; Name: string; Count: string };
	NODE: (RekordboxPlaylistNode | RekordboxFolderNode)[];
}

interface RekordboxLibrary {
	DJ_PLAYLISTS: {
		COLLECTION: {
			__attributes: { Entries: string };
			TRACK: RekordboxTrackNode[];
		};
		PLAYLISTS: {
			NODE: RekordboxPlaylistNode | RekordboxFolderNode;
		};
	};
}

interface Track {
	path: string;
}

interface Playlist {
	name: string;
	count: number;
	tracks: Track[];
}

export async function parseLibrary(
	filePath: string,
): Promise<RekordboxLibrary> {
	const file = Bun.file(filePath);
	const content = await file.text();
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "",
		attributesGroupName: "__attributes",
	});
	return parser.parse(content);
}

export function parseTracks(tracks: RekordboxTrackNode[]) {
	return tracks.reduce(
		(acc, track) => {
			acc[track.__attributes.TrackID] = { path: track.__attributes.Location };
			return acc;
		},
		{} as Record<string, Track>,
	);
}
export function parsePlaylists(
	node: RekordboxPlaylistNode | RekordboxFolderNode,
	trackIndex: Record<string, Track>,
): Playlist[] {
	if ("NODE" in node)
		return node.NODE.flatMap((node) => parsePlaylists(node, trackIndex));
	const tracks = node.TRACK.map(
		({ __attributes }) => trackIndex[__attributes.Key],
	);

	return [{ name: node.__attributes.Name, count: node.TRACK.length, tracks }];
}
