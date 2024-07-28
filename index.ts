import { mkdir, copyFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { resolve, basename } from "node:path";

import { parsePlaylists, parseLibrary, parseTracks } from "./src/parsers";

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		file: {
			type: "string",
			short: "f",
		},
		destination: {
			type: "string",
			short: "d",
			default: "./",
		},
		playlist: {
			type: "string",
			short: "p",
		},
	},
	strict: true,
	allowPositionals: true,
});

function playlistToFolderName(name: string) {
	return name.replace(/\s+/g, "-").replace(/\//g, "-").replace(/-+/g, "-");
}

async function main() {
	if (!values.file) throw Error("--file is required.");

	const data = await parseLibrary(values.file);

	const trackIndex = parseTracks(data.DJ_PLAYLISTS.COLLECTION.TRACK);

	const playlists = parsePlaylists(
		data.DJ_PLAYLISTS.PLAYLISTS.NODE,
		trackIndex,
	);

	if (!values.playlist) {
		console.log(`Found ${playlists.length} playlists:`);
		for (const p of playlists) {
			console.log(`\t${p.name} (${p.count} tracks)`);
		}
		return;
	}
	const playlist = playlists.find(({ name }) => name === values.playlist);
	if (!playlist) throw Error(`No playlist called "${values.playlist}'`);

	const path = resolve(
		`${values.destination}/${playlistToFolderName(playlist.name)}`,
	);
	await mkdir(path, { recursive: true });
	for (const t of playlist.tracks) {
		const srcPath = fileURLToPath(t.path);
		const fileName = basename(srcPath);
		await copyFile(srcPath, `${path}/${fileName}`);
	}
	console.log(`Moved to ${path}`);
}

try {
	await main();
} catch (e) {
	console.error((e as Error).message);
}
